import express from "express";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sgMail from "@sendgrid/mail";
import "dotenv/config"; // 管理環境變數

// ================================================================
// --- 初始化與設定 (Initialization & Configuration) ---
// ================================================================

const adapter = new JSONFile(
  process.env.NODE_ENV === "production" ? "/data/db.json" : "db.json"
);
const defaultData = {
  products: [],
  orders: [],
  users: [],
  requests: [],
  categories: [],
};
const db = new Low(adapter, defaultData);
await db.read();

db.data ||= defaultData;
for (const key in defaultData) {
  db.data[key] ||= defaultData[key];
}

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your_super_secret_key_12345_and_make_it_long";
const NOTIFICATION_EMAIL =
  process.env.NOTIFICATION_EMAIL || "rruntiger@gmail.com";
const FROM_EMAIL = process.env.FROM_EMAIL || "rruntiger@gmail.com";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ================================================================
// --- 服務與啟動腳本 (Services & Startup Scripts) ---
// ================================================================

async function sendEmailNotification({ subject, text, html }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("SENDGRID_API_KEY 未設定，跳過寄送郵件。");
    return;
  }
  const msg = {
    to: NOTIFICATION_EMAIL,
    from: { email: FROM_EMAIL, name: "代採購大平台通知" },
    subject,
    text,
    html,
  };
  try {
    await sgMail.send(msg);
    console.log("郵件通知已成功寄出至:", NOTIFICATION_EMAIL);
  } catch (error) {
    console.error(
      "!!! 寄送郵件時發生嚴重錯誤 !!!",
      error.response ? error.response.body : error
    );
  }
}

async function initializeAdminUser() {
  const adminUsername = "randy";
  let adminUser = db.data.users.find((u) => u.username === adminUsername);
  if (!adminUser) {
    console.log(`!!! 找不到管理者 ${adminUsername}，正在建立新的帳號...`);
    const passwordHash = await bcrypt.hash("randy1007", 10);
    adminUser = {
      id: `user_${Date.now()}`,
      username: adminUsername,
      passwordHash,
      role: "admin",
    };
    db.data.users.push(adminUser);
    await db.write();
    console.log(`!!! 管理者 ${adminUsername} 已成功建立。`);
  } else if (adminUser.role !== "admin") {
    console.log(`!!! 將管理者 ${adminUser.username} 的角色更正為 admin...`);
    adminUser.role = "admin";
    await db.write();
  }
}

// ================================================================
// --- 中介軟體 (Middleware) ---
// ================================================================

app.use(cors());
app.use(express.json());

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function authorizeAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "權限不足，此操作需要管理員身份" });
  }
  next();
}

// ================================================================
// --- API 路由 (Routes) ---
// ================================================================

// --- 公開路由 (Public Routes) ---
app.post("/api/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = db.data.users.find((u) => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }
    const payload = { username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
    res.json({ message: "登入成功", token });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products", (req, res, next) => {
  try {
    // ▼▼▼ 關鍵修復 ▼▼▼
    // 如果商品狀態為 'published' 或 'undefined' (代表是舊資料)，都將其視為上架商品
    const publishedProducts = db.data.products.filter(
      (p) => p.status === "published" || p.status === undefined
    );
    const sortedProducts = [...publishedProducts].sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );
    res.json(sortedProducts);
  } catch (error) {
    next(error);
  }
});

app.get("/api/products/:id", (req, res, next) => {
  try {
    const product = db.data.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ message: "找不到該商品" });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders", async (req, res, next) => {
  try {
    const orderData = req.body;
    if (
      !orderData.paopaohuId ||
      !orderData.lastFiveDigits ||
      !orderData.email ||
      !orderData.items ||
      orderData.items.length === 0
    ) {
      return res.status(400).json({ message: "訂單資料不完整" });
    }
    const newOrder = {
      orderId: `ord_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "待處理",
      isNew: true,
      activityLog: [],
      ...orderData,
    };
    db.data.orders.push(newOrder);
    await db.write();
    sendEmailNotification({
      subject: `[新訂單通知] 訂單編號: ${newOrder.orderId}`,
      html: `<h2>新訂單通知</h2><p><strong>訂單編號:</strong> ${newOrder.orderId}</p><p><strong>跑跑虎ID:</strong> ${orderData.paopaohuId}</p><p><strong>總金額:</strong> ${orderData.totalAmount} TWD</p><p>請盡快登入後台處理。</p>`,
    });
    res.status(201).json({ message: "訂單建立成功", order: newOrder });
  } catch (error) {
    next(error);
  }
});

app.post("/api/requests", async (req, res, next) => {
  try {
    const requestData = req.body;
    if (
      !requestData.productUrl ||
      !requestData.productName ||
      !requestData.contactInfo
    ) {
      return res.status(400).json({ message: "請求資料不完整" });
    }
    const newRequest = {
      requestId: `req_${Date.now()}`,
      receivedAt: new Date().toISOString(),
      status: "待報價",
      isNew: true,
      ...requestData,
    };
    db.data.requests.push(newRequest);
    await db.write();
    sendEmailNotification({
      subject: `[新代採購請求] 來自: ${requestData.contactInfo}`,
      html: `<h2>新代採購請求</h2><p><strong>聯絡方式:</strong> ${requestData.contactInfo}</p><p><strong>商品名稱:</strong> ${requestData.productName}</p><p>請盡快登入後台處理。</p>`,
    });
    res.status(201).json({ message: "代採購請求已收到", request: newRequest });
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders/lookup", async (req, res, next) => {
  try {
    const { paopaohuId } = req.query;
    if (!paopaohuId)
      return res.status(400).json({ message: "請提供跑跑虎會員編號" });
    const foundOrders = db.data.orders.filter(
      (order) => order.paopaohuId === paopaohuId
    );
    res.json(foundOrders.reverse());
  } catch (error) {
    next(error);
  }
});

app.get("/api/categories", async (req, res, next) => {
  try {
    res.json(db.data.categories);
  } catch (error) {
    next(error);
  }
});

// --- 受保護路由 (Protected Routes, 需登入) ---
app.get("/api/notifications/summary", authenticateToken, (req, res, next) => {
  try {
    const newOrdersCount = db.data.orders.filter((o) => o.isNew).length;
    const newRequestsCount = db.data.requests.filter((r) => r.isNew).length;
    res.json({ newOrdersCount, newRequestsCount });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard-summary", authenticateToken, (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Taipei" })
    );
    todayStart.setHours(0, 0, 0, 0);
    const dayOfWeek = todayStart.getDay();
    const diff = todayStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const thisWeekStart = new Date(new Date(todayStart).setDate(diff)); // 修正以避免影響 todayStart
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const getStats = (orders, startDate) => {
      const filteredOrders = orders.filter(
        (o) => new Date(o.createdAt) >= startDate
      );
      return {
        count: filteredOrders.length,
        sales: filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      };
    };
    res.json({
      today: getStats(db.data.orders, todayStart),
      thisWeek: getStats(db.data.orders, thisWeekStart),
      thisMonth: getStats(db.data.orders, thisMonthStart),
      thisYear: getStats(db.data.orders, thisYearStart),
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/user/password", authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = db.data.users.find((u) => u.username === req.user.username);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ message: "目前的密碼不正確" });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await db.write();
    res.json({ message: "密碼更新成功！" });
  } catch (error) {
    next(error);
  }
});

// --- 管理員路由 (Admin Only Routes) ---
app.get(
  "/api/admin/products",
  authenticateToken,
  authorizeAdmin,
  (req, res, next) => {
    try {
      const sortedProducts = [...db.data.products].sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
      );
      res.json(sortedProducts);
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/products",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const {
        title,
        price,
        category,
        imageUrl,
        serviceFee,
        longDescription,
        stock,
        status,
        tags,
      } = req.body;
      if (!title || price === undefined)
        return res.status(400).json({ message: "商品標題和價格為必填項" });

      const maxOrder = db.data.products.reduce(
        (max, p) => Math.max(max, p.sortOrder || 0),
        -1
      );
      const newProduct = {
        id: `p${Date.now()}`,
        title,
        price: Number(price) || 0,
        category: category || "未分類",
        imageUrl: imageUrl || "",
        serviceFee: Number(serviceFee) || 0,
        longDescription: longDescription || "",
        stock: Number(stock) || 0,
        status: status || "published",
        tags: Array.isArray(tags) ? tags : [],
        sortOrder: maxOrder + 1,
      };
      db.data.products.push(newProduct);
      await db.write();
      res.status(201).json(newProduct);
    } catch (error) {
      next(error);
    }
  }
);

app.put(
  "/api/products/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const productIndex = db.data.products.findIndex(
        (p) => p.id === req.params.id
      );
      if (productIndex === -1)
        return res.status(404).json({ message: "找不到該商品" });

      const productToUpdate = db.data.products[productIndex];
      const {
        title,
        price,
        category,
        imageUrl,
        serviceFee,
        longDescription,
        stock,
        status,
        tags,
        sortOrder,
      } = req.body;

      if (title !== undefined) productToUpdate.title = title;
      if (price !== undefined) productToUpdate.price = Number(price);
      if (category !== undefined) productToUpdate.category = category;
      if (imageUrl !== undefined) productToUpdate.imageUrl = imageUrl;
      if (serviceFee !== undefined)
        productToUpdate.serviceFee = Number(serviceFee);
      if (longDescription !== undefined)
        productToUpdate.longDescription = longDescription;
      if (stock !== undefined) productToUpdate.stock = Number(stock);
      if (status !== undefined) productToUpdate.status = status;
      if (tags !== undefined)
        productToUpdate.tags = Array.isArray(tags) ? tags : [];
      if (sortOrder !== undefined)
        productToUpdate.sortOrder = Number(sortOrder);

      await db.write();
      res.json({ message: "商品更新成功", product: productToUpdate });
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/products/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const i = db.data.products.findIndex((p) => p.id === req.params.id);
      if (i === -1) return res.status(404).json({ message: "找不到該商品" });
      db.data.products.splice(i, 1);
      await db.write();
      res.status(200).json({ message: "商品刪除成功" });
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/products/order",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds))
        return res.status(400).json({ message: "資料格式不正確" });
      orderedIds.forEach((id, index) => {
        const product = db.data.products.find((p) => p.id === id);
        if (product) product.sortOrder = index;
      });
      await db.write();
      res.json({ message: "商品順序已更新" });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/orders",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const ordersToReturn = [...db.data.orders].reverse();
      let updated = false;
      ordersToReturn.forEach((order) => {
        if (order.isNew) {
          order.isNew = false;
          updated = true;
        }
      });
      if (updated) await db.write();
      res.json(ordersToReturn);
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/orders/:orderId/status",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { status: newStatus } = req.body;
      const orderToUpdate = db.data.orders.find((o) => o.orderId === orderId);
      if (!orderToUpdate)
        return res.status(404).json({ message: "找不到該訂單" });

      const oldStatus = orderToUpdate.status;
      if (oldStatus !== newStatus) {
        orderToUpdate.status = newStatus;
        const logEntry = {
          timestamp: new Date().toISOString(),
          updatedBy: req.user.username,
          action: `狀態由「${oldStatus}」更新為「${newStatus}」`,
        };
        orderToUpdate.activityLog = orderToUpdate.activityLog || [];
        orderToUpdate.activityLog.push(logEntry);
        await db.write();
      }
      res.json({ message: "訂單狀態更新成功", order: orderToUpdate });
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/orders/:orderId",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const initialCount = db.data.orders.length;
      db.data.orders = db.data.orders.filter((o) => o.orderId !== orderId);
      if (db.data.orders.length === initialCount) {
        return res.status(404).json({ message: "找不到該訂單" });
      }
      await db.write();
      res.status(200).json({ message: "訂單刪除成功" });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/orders/bulk-delete",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { orderIds } = req.body;
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "請提供要刪除的訂單 ID" });
      }
      const initialCount = db.data.orders.length;
      db.data.orders = db.data.orders.filter(
        (o) => !orderIds.includes(o.orderId)
      );
      const deletedCount = initialCount - db.data.orders.length;
      if (deletedCount > 0) {
        await db.write();
      }
      res.status(200).json({ message: `成功刪除 ${deletedCount} 筆訂單` });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/requests",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const requestsToReturn = [...db.data.requests].reverse();
      let updated = false;
      requestsToReturn.forEach((request) => {
        if (request.isNew) {
          request.isNew = false;
          updated = true;
        }
      });
      if (updated) await db.write();
      res.json(requestsToReturn);
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/requests/:requestId/status",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { status } = req.body;
      const requestToUpdate = db.data.requests.find(
        (r) => r.requestId === requestId
      );
      if (!requestToUpdate)
        return res.status(404).json({ message: "找不到該請求" });
      requestToUpdate.status = status;
      await db.write();
      res.json({ message: "請求狀態更新成功", request: requestToUpdate });
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/users", authenticateToken, authorizeAdmin, (req, res, next) => {
  try {
    const users = db.data.users.map(({ passwordHash, ...user }) => user);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/users",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { username, password, role } = req.body;
      if (!username || !password || !role)
        return res.status(400).json({ message: "帳號、密碼和角色為必填項" });
      if (db.data.users.find((u) => u.username === username))
        return res.status(409).json({ message: "此帳號已存在" });

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = {
        id: `user_${Date.now()}`,
        username,
        passwordHash,
        role,
      };
      db.data.users.push(newUser);
      await db.write();

      const { passwordHash: _, ...userToReturn } = newUser;
      res.status(201).json(userToReturn);
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/users/:username",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { username } = req.params;
      if (username === "randy")
        return res.status(403).json({ message: "無法刪除最高管理員帳號" });

      const userIndex = db.data.users.findIndex((u) => u.username === username);
      if (userIndex === -1)
        return res.status(404).json({ message: "找不到該使用者" });

      db.data.users.splice(userIndex, 1);
      await db.write();
      res.status(200).json({ message: "使用者刪除成功" });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/categories",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "分類名稱為必填項" });
      if (db.data.categories.find((c) => c.name === name))
        return res.status(409).json({ message: "此分類已存在" });

      const newCategory = { id: `cat_${Date.now()}`, name };
      db.data.categories.push(newCategory);
      await db.write();
      res.status(201).json(newCategory);
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/api/categories/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const categoryIndex = db.data.categories.findIndex((c) => c.id === id);
      if (categoryIndex === -1)
        return res.status(404).json({ message: "找不到該分類" });

      db.data.categories.splice(categoryIndex, 1);
      await db.write();
      res.status(200).json({ message: "分類刪除成功" });
    } catch (error) {
      next(error);
    }
  }
);

// --- 路由結束 ---

// ================================================================
// --- 伺服器啟動 ---
// ================================================================

// 將集中的錯誤處理中介軟體放在所有路由之後
app.use((err, req, res, next) => {
  console.error(`[錯誤] 於 ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ message: "伺服器內部發生未知錯誤" });
});

(async () => {
  await initializeAdminUser();
  app.listen(port, () => {
    console.log(`伺服器成功啟動！正在監聽 http://localhost:${port}`);
  });
})();
