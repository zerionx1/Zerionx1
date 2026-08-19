declare module "socket.io-client" {
  type Socket = {
    on(event: string, callback: (...args: unknown[]) => void): Socket;
    emit(event: string, payload?: unknown): Socket;
    close(): void;
  };

  type SocketOptions = {
    transports?: string[];
    reconnection?: boolean;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
  };

  function io(endpoint: string, options?: SocketOptions): Socket;

  export default io;
}
