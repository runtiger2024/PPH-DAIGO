import express from "express";
import { Pool } from "pg";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sgMail from "@sendgrid/mail";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

// ================================================================
// --- 初始化與設定 (Initialization & Configuration) ---
// ================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log("正在驗證/建立資料庫資料表...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        role TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        price NUMERIC DEFAULT 0,
        category TEXT,
        "imageUrls" JSONB, /* <-- [最終修正] 從 TEXT 改為 JSONB 以儲存圖片陣列 */
        "serviceFee" NUMERIC DEFAULT 0,
        "longDescription" TEXT,
        stock INTEGER DEFAULT 0,
        status TEXT DEFAULT 'published',
        tags JSONB,
        "sortOrder" INTEGER
      );
      CREATE TABLE IF NOT EXISTS orders (
        "orderId" TEXT PRIMARY KEY,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        status TEXT,
        "isNew" BOOLEAN DEFAULT true,
        "activityLog" JSONB,
        "paopaohuId" TEXT NOT NULL,
        "lastFiveDigits" TEXT,
        email TEXT,
        items JSONB,
        "totalAmount" NUMERIC,
        "taxId" TEXT
      );
      CREATE TABLE IF NOT EXISTS requests (
        "requestId" TEXT PRIMARY KEY,
        "receivedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        status TEXT,
        "isNew" BOOLEAN DEFAULT true,
        "productUrl" TEXT,
        "productName" TEXT,
        specs TEXT,
        quantity INTEGER,
        "paopaohuId" TEXT,
        "contactInfo" TEXT,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS sites (
        site_id TEXT PRIMARY KEY,
        site_name TEXT NOT NULL,
        owner_username TEXT REFERENCES users(username),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        layout_settings JSONB,
        theme_settings JSONB,
        content_settings JSONB
      );
    `);

    // [補充健壯性] 檢查舊欄位 imageUrl 是否存在，如果存在就刪除
    // 這段程式碼只會在欄位還存在時執行一次
    const { rows } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='products' AND column_name='imageUrl';
    `);

    if (rows.length > 0) {
      console.log("偵測到舊的 imageUrl 欄位，正在移除...");
      await client.query(`ALTER TABLE products DROP COLUMN "imageUrl";`);
      console.log("舊的 imageUrl 欄位已成功移除。");
    }

    console.log("資料庫資料表已成功驗證/建立。");
  } finally {
    client.release();
  }
}

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
  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [
    adminUsername,
  ]);
  let adminUser = rows[0];

  if (!adminUser) {
    console.log(`!!! 找不到管理者 ${adminUsername}，正在建立新的帳號...`);
    const passwordHash = await bcrypt.hash("randy1007", 10);
    const id = `user_${Date.now()}`;
    await pool.query(
      `INSERT INTO users(id, username, "passwordHash", role) VALUES($1, $2, $3, $4)`,
      [id, adminUsername, passwordHash, "admin"]
    );
    console.log(`!!! 管理者 ${adminUsername} 已成功建立。`);
  } else if (adminUser.role !== "admin") {
    console.log(`!!! 將管理者 ${adminUser.username} 的角色更正為 admin...`);
    await pool.query("UPDATE users SET role = $1 WHERE username = $2", [
      "admin",
      adminUsername,
    ]);
  }
}

// ================================================================
// --- 中介軟體 (Middleware) ---
// ================================================================

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

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

app.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM sites WHERE owner_username IS NOT NULL LIMIT 1"
    );
    const siteConfig = rows[0];

    if (!siteConfig) {
      return res
        .status(404)
        .send(
          "找不到網站設定。請確認資料庫中至少有一筆網站設定且已指定管理者(owner_username)。"
        );
    }

    res.render("index", {
      layout: siteConfig.layout_settings || {},
      theme: siteConfig.theme_settings || {},
      content: siteConfig.content_settings || {},
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    const user = rows[0];

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

app.get("/api/products", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM products WHERE status = 'published' ORDER BY "sortOrder" ASC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/products/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [
      req.params.id,
    ]);
    const product = rows[0];
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
      createdAt: new Date(),
      status: "待處理",
      isNew: true,
      activityLog: [],
      ...orderData,
    };

    await pool.query(
      `INSERT INTO orders("orderId", "createdAt", status, "isNew", "activityLog", "paopaohuId", "lastFiveDigits", email, items, "totalAmount", "taxId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        newOrder.orderId,
        newOrder.createdAt,
        newOrder.status,
        newOrder.isNew,
        JSON.stringify(newOrder.activityLog),
        newOrder.paopaohuId,
        newOrder.lastFiveDigits,
        newOrder.email,
        JSON.stringify(newOrder.items),
        newOrder.totalAmount,
        newOrder.taxId,
      ]
    );

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
      receivedAt: new Date(),
      status: "待報價",
      isNew: true,
      ...requestData,
    };
    await pool.query(
      `INSERT INTO requests("requestId", "receivedAt", status, "isNew", "productUrl", "productName", specs, quantity, "paopaohuId", "contactInfo", notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        newRequest.requestId,
        newRequest.receivedAt,
        newRequest.status,
        newRequest.isNew,
        newRequest.productUrl,
        newRequest.productName,
        newRequest.specs,
        newRequest.quantity,
        newRequest.paopaohuId,
        newRequest.contactInfo,
        newRequest.notes,
      ]
    );
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
    const { rows } = await pool.query(
      `SELECT * FROM orders WHERE "paopaohuId" = $1 ORDER BY "createdAt" DESC`,
      [paopaohuId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/categories", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM categories ORDER BY name ASC"
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/notifications/summary",
  authenticateToken,
  async (req, res, next) => {
    try {
      const { rows: orderRows } = await pool.query(
        `SELECT COUNT(*) FROM orders WHERE "isNew" = true`
      );
      const { rows: requestRows } = await pool.query(
        `SELECT COUNT(*) FROM requests WHERE "isNew" = true`
      );
      res.json({
        newOrdersCount: parseInt(orderRows[0].count, 10),
        newRequestsCount: parseInt(requestRows[0].count, 10),
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get("/api/dashboard-summary", authenticateToken, async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Taipei" })
    );
    todayStart.setHours(0, 0, 0, 0);

    const dayOfWeek = todayStart.getDay();
    const diff = todayStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const thisWeekStart = new Date(new Date(todayStart).setDate(diff));
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    const getStats = async (startDate) => {
      const { rows } = await pool.query(
        `SELECT COUNT(*), SUM("totalAmount") as sales FROM orders WHERE "createdAt" >= $1`,
        [startDate]
      );
      return {
        count: parseInt(rows[0].count, 10) || 0,
        sales: parseFloat(rows[0].sales) || 0,
      };
    };

    res.json({
      today: await getStats(todayStart),
      thisWeek: await getStats(thisWeekStart),
      thisMonth: await getStats(thisMonthStart),
      thisYear: await getStats(thisYearStart),
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/user/password", authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [req.user.username]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ message: "目前的密碼不正確" });
    }
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET "passwordHash" = $1 WHERE username = $2`,
      [newPasswordHash, req.user.username]
    );
    res.json({ message: "密碼更新成功！" });
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/admin/products",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM products ORDER BY "sortOrder" ASC`
      );
      res.json(rows);
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/admin/site-settings",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT layout_settings, theme_settings, content_settings 
       FROM sites 
       WHERE owner_username = $1`,
        [req.user.username]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "找不到該管理員的網站設定" });
      }
      res.json({
        layout: rows[0].layout_settings,
        theme: rows[0].theme_settings,
        content: rows[0].content_settings,
      });
    } catch (error) {
      next(error);
    }
  }
);

app.put(
  "/api/admin/site-settings",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { layout, theme, content } = req.body;

      if (!layout || !theme || !content) {
        return res.status(400).json({ message: "提交的設定資料不完整" });
      }

      const { rows } = await pool.query(
        `UPDATE sites 
       SET layout_settings = $1, theme_settings = $2, content_settings = $3 
       WHERE owner_username = $4 
       RETURNING site_id`,
        [
          JSON.stringify(layout),
          JSON.stringify(theme),
          JSON.stringify(content),
          req.user.username,
        ]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "找不到可更新的網站設定" });
      }

      res.json({ message: "網站設定已成功更新！" });
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
        imageUrls,
        serviceFee,
        longDescription,
        stock,
        status,
        tags,
      } = req.body;
      if (!title || price === undefined)
        return res.status(400).json({ message: "商品標題和價格為必填項" });

      const { rows } = await pool.query(
        `SELECT MAX("sortOrder") as max_order FROM products`
      );
      const maxOrder = rows[0].max_order;

      const newProduct = {
        id: `p${Date.now()}`,
        title,
        price: Number(price) || 0,
        category: category || "未分類",
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
        serviceFee: Number(serviceFee) || 0,
        longDescription: longDescription || "",
        stock: Number(stock) || 0,
        status: status || "published",
        tags: Array.isArray(tags) ? tags : [],
        sortOrder: (maxOrder === null ? -1 : maxOrder) + 1,
      };

      await pool.query(
        `INSERT INTO products(id, title, price, category, "imageUrls", "serviceFee", "longDescription", stock, status, tags, "sortOrder")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          newProduct.id,
          newProduct.title,
          newProduct.price,
          newProduct.category,
          newProduct.imageUrls,
          newProduct.serviceFee,
          newProduct.longDescription,
          newProduct.stock,
          newProduct.status,
          newProduct.tags,
          newProduct.sortOrder,
        ]
      );
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
      const { id } = req.params;
      const {
        title,
        price,
        category,
        imageUrls,
        serviceFee,
        longDescription,
        stock,
        status,
        tags,
        sortOrder,
      } = req.body;

      const fields = [];
      const values = [];
      let queryIndex = 1;

      if (title !== undefined) {
        fields.push(`title = $${queryIndex++}`);
        values.push(title);
      }
      if (price !== undefined) {
        fields.push(`price = $${queryIndex++}`);
        values.push(price);
      }
      if (category !== undefined) {
        fields.push(`category = $${queryIndex++}`);
        values.push(category);
      }
      if (imageUrls !== undefined) {
        fields.push(`"imageUrls" = $${queryIndex++}`);
        values.push(imageUrls);
      }
      if (serviceFee !== undefined) {
        fields.push(`"serviceFee" = $${queryIndex++}`);
        values.push(serviceFee);
      }
      if (longDescription !== undefined) {
        fields.push(`"longDescription" = $${queryIndex++}`);
        values.push(longDescription);
      }
      if (stock !== undefined) {
        fields.push(`stock = $${queryIndex++}`);
        values.push(stock);
      }
      if (status !== undefined) {
        fields.push(`status = $${queryIndex++}`);
        values.push(status);
      }
      if (tags !== undefined) {
        fields.push(`tags = $${queryIndex++}`);
        values.push(tags);
      }
      if (sortOrder !== undefined) {
        fields.push(`"sortOrder" = $${queryIndex++}`);
        values.push(sortOrder);
      }

      if (fields.length === 0) {
        return res.status(400).json({ message: "沒有提供任何要更新的資料" });
      }

      values.push(id);
      const queryString = `UPDATE products SET ${fields.join(
        ", "
      )} WHERE id = $${queryIndex} RETURNING *`;

      const { rows } = await pool.query(queryString, values);

      if (rows.length === 0) {
        return res.status(404).json({ message: "找不到該商品" });
      }

      res.json({ message: "商品更新成功", product: rows[0] });
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
      const { rowCount } = await pool.query(
        "DELETE FROM products WHERE id = $1",
        [req.params.id]
      );
      if (rowCount === 0) {
        return res.status(404).json({ message: "找不到該商品" });
      }
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

      for (let i = 0; i < orderedIds.length; i++) {
        await pool.query(`UPDATE products SET "sortOrder" = $1 WHERE id = $2`, [
          i,
          orderedIds[i],
        ]);
      }

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
      const { rows } = await pool.query(
        `SELECT * FROM orders ORDER BY "createdAt" DESC`
      );
      pool.query(`UPDATE orders SET "isNew" = false WHERE "isNew" = true`);
      res.json(rows);
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

      const { rows } = await pool.query(
        `SELECT * FROM orders WHERE "orderId" = $1`,
        [orderId]
      );
      const orderToUpdate = rows[0];

      if (!orderToUpdate)
        return res.status(404).json({ message: "找不到該訂單" });

      const oldStatus = orderToUpdate.status;
      if (oldStatus !== newStatus) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          updatedBy: req.user.username,
          action: `狀態由「${oldStatus}」更新為「${newStatus}」`,
        };

        const newActivityLog = orderToUpdate.activityLog || [];
        newActivityLog.push(logEntry);

        const { rows: updatedRows } = await pool.query(
          `UPDATE orders SET status = $1, "activityLog" = $2 WHERE "orderId" = $3 RETURNING *`,
          [newStatus, JSON.stringify(newActivityLog), orderId]
        );
        res.json({ message: "訂單狀態更新成功", order: updatedRows[0] });
      } else {
        res.json({ message: "訂單狀態無變更", order: orderToUpdate });
      }
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
      const { rowCount } = await pool.query(
        `DELETE FROM orders WHERE "orderId" = $1`,
        [orderId]
      );
      if (rowCount === 0) {
        return res.status(404).json({ message: "找不到該訂單" });
      }
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
      const { rowCount } = await pool.query(
        `DELETE FROM orders WHERE "orderId" = ANY($1::text[])`,
        [orderIds]
      );
      res.status(200).json({ message: `成功刪除 ${rowCount} 筆訂單` });
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
      const { rows } = await pool.query(
        `SELECT * FROM requests ORDER BY "receivedAt" DESC`
      );
      pool.query(`UPDATE requests SET "isNew" = false WHERE "isNew" = true`);
      res.json(rows);
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
      const { rows } = await pool.query(
        `UPDATE requests SET status = $1 WHERE "requestId" = $2 RETURNING *`,
        [status, requestId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: "找不到該請求" });
      }
      res.json({ message: "請求狀態更新成功", request: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/users",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { rows } = await pool.query("SELECT id, username, role FROM users");
      res.json(rows);
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/users",
  authenticateToken,
  authorizeAdmin,
  async (req, res, next) => {
    try {
      const { username, password, role } = req.body;
      if (!username || !password || !role)
        return res.status(400).json({ message: "帳號、密碼和角色為必填項" });

      const { rows: existingUsers } = await pool.query(
        "SELECT id FROM users WHERE username = $1",
        [username]
      );
      if (existingUsers.length > 0)
        return res.status(409).json({ message: "此帳號已存在" });

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = {
        id: `user_${Date.now()}`,
        username,
        role,
      };

      await pool.query(
        `INSERT INTO users(id, username, "passwordHash", role) VALUES ($1, $2, $3, $4)`,
        [newUser.id, newUser.username, passwordHash, newUser.role]
      );

      res.status(201).json(newUser);
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

      const { rowCount } = await pool.query(
        "DELETE FROM users WHERE username = $1",
        [username]
      );

      if (rowCount === 0)
        return res.status(404).json({ message: "找不到該使用者" });

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

      const { rows: existing } = await pool.query(
        "SELECT id FROM categories WHERE name = $1",
        [name]
      );
      if (existing.length > 0)
        return res.status(409).json({ message: "此分類已存在" });

      const newCategory = { id: `cat_${Date.now()}`, name };
      await pool.query("INSERT INTO categories(id, name) VALUES ($1, $2)", [
        newCategory.id,
        newCategory.name,
      ]);
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
      const { rowCount } = await pool.query(
        "DELETE FROM categories WHERE id = $1",
        [id]
      );
      if (rowCount === 0)
        return res.status(404).json({ message: "找不到該分類" });

      res.status(200).json({ message: "分類刪除成功" });
    } catch (error) {
      next(error);
    }
  }
);

// ================================================================
// --- 伺服器啟動 ---
// ================================================================

app.use((err, req, res, next) => {
  console.error(`[錯誤] 於 ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ message: "伺服器內部發生未知錯誤" });
});

(async () => {
  try {
    await initializeDatabase();
    await initializeAdminUser();
    app.listen(port, () => {
      console.log(`伺服器成功啟動！正在監聽 http://localhost:${port}`);
    });
  } catch (error) {
    console.error("!!! 伺服器啟動失敗 !!!", error);
    process.exit(1);
  }
})();
