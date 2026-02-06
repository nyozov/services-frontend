const API_URL = process.env.NEXT_PUBLIC_API_URL

const getHeaders = async (token?: string | null) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Stores
export const storesApi = {
  getAll: async (token: string) => {
    const response = await fetch(`${API_URL}/stores`, {
      headers: await getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to fetch stores');
    return response.json();
  },

  getBySlug: async (slug: string) => {
    const response = await fetch(`${API_URL}/stores/${slug}`);
    if (!response.ok) throw new Error('Store not found');
    return response.json();
  },

  create: async (token: string, data: { name: string; description?: string }) => {
    const response = await fetch(`${API_URL}/stores`, {
      method: 'POST',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create store');
    return response.json();
  },
  update: async (
    token: string,
    storeId: string,
    data: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
      primaryColor?: string;
      bannerImage?: string | null;
      logoImage?: string | null;
      showBranding?: boolean;
      enableReviews?: boolean;
      showSocialLinks?: boolean;
      websiteUrl?: string | null;
      instagramUrl?: string | null;
      twitterUrl?: string | null;
    }
  ) => {
    const response = await fetch(`${API_URL}/stores/${storeId}`, {
      method: 'PATCH',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update store');
    return response.json();
  },
};

export const itemsApi = {
  getByStoreId: async (token: string, storeId: string) => {
    const response = await fetch(`${API_URL}/items/store/${storeId}`, {
      headers: await getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to fetch items');
    return response.json();
  },

  create: async (
    token: string,
    data: {
      storeId: string;
      name: string;
      description?: string;
      price: number;
      imageUrl?: string;
    }
  ) => {
    const response = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create item');
    return response.json();
  },
};

export const usersApi = {
  sync: async (data: { clerkUserId: string; email: string; name?: string }) => {
    const response = await fetch(`${API_URL}/users/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to sync user');
    return response.json();
  },
};

export const stripeApi = {
  createCheckoutSession: async (itemId: string, buyerEmail: string) => {
    const response = await fetch(`${API_URL}/stripe/checkout`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ itemId, buyerEmail }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }
    return response.json();
  },

  verifySession: async (sessionId: string) => {
    const response = await fetch(`${API_URL}/stripe/verify-session/${sessionId}`, {
      method: 'GET',
      headers: await getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify session');
    }
    return response.json();
  },
};

export const conversationsApi = {
  getAll: async (token: string) => {
    const response = await fetch(`${API_URL}/conversations`, {
      headers: await getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
  },

  getMessages: async (token: string, conversationId: string) => {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
      headers: await getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  },

  getUnreadCount: async (token: string) => {
    const response = await fetch(`${API_URL}/conversations/unread-count`, {
      headers: await getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to fetch unread count');
    return response.json();
  },

  markRead: async (token: string, conversationId: string) => {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: await getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to mark conversation read');
    return response.json();
  },

  markAllRead: async (token: string) => {
    const response = await fetch(`${API_URL}/conversations/mark-all-read`, {
      method: 'POST',
      headers: await getHeaders(token),
    });
    if (!response.ok) throw new Error('Failed to mark all read');
    return response.json();
  },

  sendMessage: async (data: {
    content: string;
    conversationId?: string;
    recipientUserId?: string;
    guest?: { email: string; name?: string };
    token?: string | null;
  }) => {
    const headers = await getHeaders(data.token);
    const response = await fetch(`${API_URL}/conversations/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: data.content,
        conversationId: data.conversationId,
        recipientUserId: data.recipientUserId,
        guest: data.guest,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }
    return response.json();
  },

  getGuestConversation: async (token: string) => {
    const response = await fetch(`${API_URL}/conversations/guest/${token}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch conversation');
    }
    return response.json();
  },

  sendGuestMessage: async (token: string, content: string) => {
    const response = await fetch(`${API_URL}/conversations/guest/${token}/message`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }
    return response.json();
  },
};
