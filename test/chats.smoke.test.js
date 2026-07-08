const test = require("node:test");
const assert = require("node:assert/strict");

const chatController = require("../src/modules/chats/chat.controller");
const authMiddleware = require("../src/middleware/auth.middleware");
const roleMiddleware = require("../src/middleware/role.middleware");

const servicePath = require.resolve("../src/modules/chats/chat.service");
const modelPath = require.resolve("../src/modules/chats/chat.model");

const createRes = () => {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
};

const loadChatService = ({ chatModel }) => {
  const originalCache = {
    service: require.cache[servicePath],
    model: require.cache[modelPath],
  };

  delete require.cache[servicePath];
  require.cache[modelPath] = {
    id: modelPath,
    filename: modelPath,
    loaded: true,
    exports: chatModel,
  };

  const chatService = require(servicePath);

  const restore = () => {
    delete require.cache[servicePath];
    delete require.cache[modelPath];

    Object.entries(originalCache).forEach(([key, value]) => {
      if (!value) return;
      const pathByKey = {
        service: servicePath,
        model: modelPath,
      };
      require.cache[pathByKey[key]] = value;
    });
  };

  return { chatService, restore };
};

test("auth middleware returns 401 without bearer token for chats", () => {
  const req = { headers: {} };
  const res = createRes();
  const next = () => {};

  authMiddleware(req, res, next);

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.success, false);
});

test("role middleware returns 403 when admin tries chat endpoint", () => {
  const req = { user: { id: 1, role: "admin" } };
  const res = createRes();
  const next = () => {};

  roleMiddleware("customer", "owner")(req, res, next);

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.success, false);
});

test("role middleware allows customer for chat endpoints", () => {
  const req = { user: { id: 2, role: "customer" } };
  const res = createRes();
  let called = false;

  const next = () => {
    called = true;
  };

  roleMiddleware("customer", "owner")(req, res, next);

  assert.equal(called, true);
});

test("role middleware allows owner for chat endpoints", () => {
  const req = { user: { id: 3, role: "owner" } };
  const res = createRes();
  let called = false;

  const next = () => {
    called = true;
  };

  roleMiddleware("customer", "owner")(req, res, next);

  assert.equal(called, true);
});

test("create conversation returns 400 for empty payload", async () => {
  const req = { body: {}, user: { id: 1, role: "customer" } };
  const res = createRes();
  const next = () => {};

  await chatController.createConversation(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("create conversation returns 400 without initial_message", async () => {
  const req = { body: { property_id: 1 }, user: { id: 1, role: "customer" } };
  const res = createRes();
  const next = () => {};

  await chatController.createConversation(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("send message returns 400 for empty body", async () => {
  const req = {
    params: { conversationId: "1" },
    body: {},
    user: { id: 1, role: "customer" },
  };
  const res = createRes();
  const next = () => {};

  await chatController.sendMessage(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Validation failed");
});

test("send message returns 400 for empty message_body", async () => {
  const req = {
    params: { conversationId: "1" },
    body: { message_body: "" },
    user: { id: 1, role: "customer" },
  };
  const res = createRes();
  const next = () => {};

  await chatController.sendMessage(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
});

test("get messages returns 400 for invalid conversation ID", async () => {
  const req = {
    params: { conversationId: "abc" },
    user: { id: 1, role: "customer" },
  };
  const res = createRes();
  const next = () => {};

  await chatController.getMessages(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Invalid conversation ID");
});

test("mark as read returns 400 for invalid conversation ID", async () => {
  const req = {
    params: { conversationId: "abc" },
    user: { id: 1, role: "customer" },
  };
  const res = createRes();
  const next = () => {};

  await chatController.markAsRead(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.message, "Invalid conversation ID");
});

test("chat service creates a conversation with initial message", async () => {
  const calls = {};
  const chatModel = {
    findPropertyById: async (propertyId) => {
      calls.findPropertyById = propertyId;
      return { id: propertyId, owner_id: 2, property_name: "Test Hotel", status_name: "approved" };
    },
    findReservationById: async () => null,
    findConversationByReservation: async () => null,
    getConversationsForUser: async () => [],
    createConversation: async (data) => {
      calls.createConversation = data;
      return 1;
    },
    createMessage: async (data) => {
      calls.createMessage = data;
      return 1;
    },
    findConversationById: async () => {
      return {
        id: 1,
        property_id: 1,
        reservation_id: null,
        customer_id: 1,
        owner_id: 2,
        status: "open",
        created_at: new Date().toISOString(),
      };
    },
  };

  const { chatService, restore } = loadChatService({ chatModel });

  try {
    const conversation = await chatService.createConversation(1, "customer", {
      property_id: 1,
      initial_message: "Hello, I have a question about this property",
    });

    assert.equal(calls.findPropertyById, 1);
    assert.equal(calls.createConversation.customer_id, 1);
    assert.equal(calls.createConversation.owner_id, 2);
    assert.equal(calls.createMessage.conversation_id, 1);
    assert.equal(calls.createMessage.sender_id, 1);
    assert.equal(calls.createMessage.message_body, "Hello, I have a question about this property");
    assert.equal(conversation.id, 1);
  } finally {
    restore();
  }
});

test("chat service returns conversations for a user", async () => {
  const calls = {};
  const mockConversations = [
    {
      id: 1,
      property_id: 1,
      reservation_id: null,
      customer_id: 1,
      owner_id: 2,
      status: "open",
      property_name: "Test Hotel",
      last_message: "Hello!",
      unread_count: 0,
    },
  ];

  const chatModel = {
    getConversationsForUser: async (userId) => {
      calls.getConversationsForUser = userId;
      return mockConversations;
    },
  };

  const { chatService, restore } = loadChatService({ chatModel });

  try {
    const conversations = await chatService.getMyConversations(1);

    assert.equal(calls.getConversationsForUser, 1);
    assert.equal(conversations.length, 1);
    assert.equal(conversations[0].property_name, "Test Hotel");
    assert.equal(conversations[0].unread_count, 0);
  } finally {
    restore();
  }
});

test("chat service sends a message in a conversation", async () => {
  const calls = {};
  const chatModel = {
    findConversationById: async (id) => {
      calls.findConversationById = id;
      return {
        id: 1,
        customer_id: 1,
        owner_id: 2,
        status: "open",
      };
    },
    createMessage: async (data) => {
      calls.createMessage = data;
      return 2;
    },
    updateConversationLastMessage: async (id) => {
      calls.updateConversationLastMessage = id;
    },
    getMessagesByConversationId: async (id) => {
      calls.getMessagesByConversationId = id;
      return [
        { id: 1, message_body: "Hello!" },
        { id: 2, message_body: "Hi, I have a question" },
      ];
    },
  };

  const { chatService, restore } = loadChatService({ chatModel });

  try {
    const message = await chatService.sendMessage(1, 1, {
      message_body: "Hi, I have a question",
    });

    assert.equal(calls.findConversationById, 1);
    assert.equal(calls.createMessage.conversation_id, 1);
    assert.equal(calls.createMessage.sender_id, 1);
    assert.equal(calls.createMessage.message_body, "Hi, I have a question");
    assert.equal(calls.updateConversationLastMessage, 1);
    assert.equal(message.message_body, "Hi, I have a question");
  } finally {
    restore();
  }
});

test("chat service rejects message from non-participant", async () => {
  const chatModel = {
    findConversationById: async () => {
      return {
        id: 1,
        customer_id: 1,
        owner_id: 2,
      };
    },
  };

  const { chatService, restore } = loadChatService({ chatModel });

  try {
    await assert.rejects(
      chatService.sendMessage(1, 3, { message_body: "Hello" }),
      (error) => {
        assert.equal(error.message, "You do not have access to this conversation");
        assert.equal(error.statusCode, 403);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("chat service rejects non-participant viewing messages", async () => {
  const chatModel = {
    findConversationById: async () => {
      return {
        id: 1,
        customer_id: 1,
        owner_id: 2,
      };
    },
  };

  const { chatService, restore } = loadChatService({ chatModel });

  try {
    await assert.rejects(
      chatService.getMessages(1, 3),
      (error) => {
        assert.equal(error.message, "You do not have access to this conversation");
        assert.equal(error.statusCode, 403);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("chat service marks messages as read", async () => {
  const calls = {};
  const chatModel = {
    findConversationById: async (id) => {
      calls.findConversationById = id;
      return { id: 1, customer_id: 1, owner_id: 2 };
    },
    markMessagesAsRead: async (conversationId, userId) => {
      calls.markMessagesAsRead = { conversationId, userId };
      return 3;
    },
  };

  const { chatService, restore } = loadChatService({ chatModel });

  try {
    const result = await chatService.markAsRead(1, 1);

    assert.equal(calls.findConversationById, 1);
    assert.deepEqual(calls.markMessagesAsRead, {
      conversationId: 1,
      userId: 1,
    });
    assert.equal(result.marked_read, 3);
  } finally {
    restore();
  }
});

test("chat service rejects non-participant marking read", async () => {
  const chatModel = {
    findConversationById: async () => {
      return { id: 1, customer_id: 1, owner_id: 2 };
    },
  };

  const { chatService, restore } = loadChatService({ chatModel });

  try {
    await assert.rejects(
      chatService.markAsRead(1, 3),
      (error) => {
        assert.equal(error.message, "You do not have access to this conversation");
        assert.equal(error.statusCode, 403);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("chat service returns 404 for non-existent conversation", async () => {
  const chatModel = {
    findConversationById: async () => null,
  };

  const { chatService, restore } = loadChatService({ chatModel });

  try {
    await assert.rejects(
      chatService.getMessages(999, 1),
      (error) => {
        assert.equal(error.message, "Conversation not found");
        assert.equal(error.statusCode, 404);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("chat service returns 404 for non-existent property", async () => {
  const chatModel = {
    findPropertyById: async () => null,
  };

  const { chatService, restore } = loadChatService({ chatModel });

  try {
    await assert.rejects(
      chatService.startConversationFromProperty(1, "customer", 999),
      (error) => {
        assert.equal(error.message, "Property not found");
        assert.equal(error.statusCode, 404);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("chat service rejects non-customer starting from property", async () => {
  const { chatService, restore } = loadChatService({
    chatModel: {},
  });

  try {
    await assert.rejects(
      chatService.startConversationFromProperty(2, "owner", 1),
      (error) => {
        assert.equal(error.message, "Only customers can start conversations from a property");
        assert.equal(error.statusCode, 403);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test("chat service rejects duplicate property conversation", async () => {
  const chatModel = {
    findPropertyById: async () => {
      return { id: 1, owner_id: 2, property_name: "Test", status_name: "approved" };
    },
    getConversationsForUser: async () => {
      return [
        {
          id: 1,
          property_id: 1,
          customer_id: 1,
          owner_id: 2,
        },
      ];
    },
  };

  const { chatService, restore } = loadChatService({ chatModel });

  try {
    await assert.rejects(
      chatService.startConversationFromProperty(1, "customer", 1),
      (error) => {
        assert.equal(error.message, "A conversation for this property already exists");
        assert.equal(error.statusCode, 409);
        return true;
      }
    );
  } finally {
    restore();
  }
});