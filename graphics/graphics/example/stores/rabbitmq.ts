import { defineStore } from "pinia";
import { ref } from "vue";
import { Client, type IMessage } from "@stomp/stompjs";

export type RabbitSubscriptionConfig<T> = {
  exchange: string;
  onMessage: (msg: T) => void;
};

/**
 * STOMP поверх WebSocket к RabbitMQ (web-stomp), по тому же принципу, что в dispatcher-app-main.
 * Подписка: destination `/exchange/{exchangeName}`, тело JSON с полем `message` — полезная нагрузка.
 */
export const useRabbitMQStore = defineStore("rabbitMQ", () => {
  const client = ref<Client>();
  const isConnected = ref(false);

  function getBrokerUrl(): string {
    const rc = useRuntimeConfig();
    return String(rc.public.brokerApiUrl ?? "").trim();
  }

  function initClient(): Client | undefined {
    const brokerUrl = getBrokerUrl();
    if (!brokerUrl) {
      return undefined;
    }

    const rc = useRuntimeConfig();
    const login = String(rc.public.brokerLogin ?? "");
    const pass = String(rc.public.brokerPassword ?? "");

    const stompClient = new Client({
      brokerURL: brokerUrl,
      connectHeaders: {
        login,
        passcode: pass,
      },
      reconnectDelay: 1000,
      heartbeatIncoming: 40000,
      heartbeatOutgoing: 40000,
      connectionTimeout: 20000,
    });

    stompClient.onConnect = () => {
      console.info("[rabbitmq] подключено к брокеру");
      isConnected.value = true;
    };

    stompClient.onDisconnect = () => {
      console.info("[rabbitmq] отключено от брокера");
      isConnected.value = false;
    };

    stompClient.onStompError = (frame) => {
      console.error("[rabbitmq] STOMP:", frame.headers.message);
    };

    stompClient.onWebSocketError = (error) => {
      console.error("[rabbitmq] WebSocket:", error);
    };

    return stompClient;
  }

  function connect(): void {
    if (!getBrokerUrl()) {
      return;
    }
    if (!client.value) {
      const stomp = initClient();
      if (!stomp) return;
      client.value = stomp;
      client.value.activate();
    }
  }

  function disconnect(): void {
    client.value?.deactivate();
    client.value = undefined;
    isConnected.value = false;
  }

  function subscribe<T>(config: RabbitSubscriptionConfig<T>): void {
    if (!getBrokerUrl()) {
      console.warn("[rabbitmq] subscribe пропущен: задайте NUXT_PUBLIC_BROKER_API_URL");
      return;
    }

    if (!client.value || !isConnected.value) {
      console.warn("[rabbitmq] ещё не подключено — повтор подписки через 500 мс");
      setTimeout(() => subscribe(config), 500);
      return;
    }

    const { exchange, onMessage } = config;

    client.value.subscribe(`/exchange/${exchange}`, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body) as { message?: T };
        if (data.message !== undefined) {
          onMessage(data.message as T);
        }
      } catch (err) {
        console.error("[rabbitmq] разбор сообщения:", err);
      }
    });
  }

  return { connect, disconnect, subscribe, isConnected, client };
});
