export default defineNuxtPlugin(() => {
  const rabbit = useRabbitMQStore();
  rabbit.connect();
});
