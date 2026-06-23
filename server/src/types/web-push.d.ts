declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string;
    expirationTime: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  export interface RequestDetails {
    endpoint: string;
    expirationTime: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  export interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  export interface VapidDetails {
    subject: string;
    publicKey: string;
    privateKey: string;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function sendNotification(
    pushSubscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: {
      vapidDetails?: VapidDetails;
      TTL?: number;
      headers?: Record<string, string | number>;
      contentEncoding?: string;
      urgency?: string;
      topic?: string;
      proxy?: string;
    }
  ): Promise<SendResult>;

  export function generateVAPIDKeys(): {
    publicKey: string;
    privateKey: string;
  };
}
