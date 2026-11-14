const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { WebSocketServer } = require('ws');
const { PDFDocument } = require('pdf-lib');

const storage = require('./src/storage');
const printerService = require('./src/printer-service');
const cleanupService = require('./src/cleanup-service');
const tunnelService = require('./src/tunnel-service');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3005;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper to get local IPv4 address
function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const dev in ifaces) {
    for (const details of ifaces[dev]) {
      if (details.family === 'IPv4' && !details.internal && 
         (details.address.startsWith('192.168.') || details.address.startsWith('10.') || details.address.startsWith('172.'))) {
        return details.address;
      }
    }
  }
  return 'localhost';
}

// Broadcast helper for WebSocket
function broadcast(event, payload, targetRoom = null) {
  const message = JSON.stringify({ event, payload });
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      if (!targetRoom || client.room === targetRoom || client.room === 'admin_stream') {
        client.send(message);
      }
    }
  });
}

// Multer storage setup - no file size limit
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const unique = `${Date.now()}_${uuidv4().slice(0, 8)}_${safeName}`;
    cb(null, unique);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];

  if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and PDF files are supported!'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter,
  limits: {
    // No file size limit as requested
    fileSize: Infinity
  }
});

app.use(express.json({ limit: '100mb' }));
app.use(express.text({ type: ['text/plain', 'text/*'], limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Admin Authentication Middleware
function requireAdminAuth(req, res, next) {
  // Allow login endpoint without token
  if (req.path === '/login') return next();

  const token = req.headers['x-admin-token'] || (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (token && storage.isValidAdminSession(token)) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
}

// Admin Authentication Endpoints
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (storage.verifyAdminCredentials(username, password)) {
    const token = storage.createAdminSession();
    console.log(`[Auth] Admin signed in successfully.`);
    return res.json({ success: true, token, username: 'Admin' });
  }
  return res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/api/admin/verify-token', (req, res) => {
  const token = req.headers['x-admin-token'] || (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (token && storage.isValidAdminSession(token)) {
    return res.json({ success: true, valid: true });
  }
  return res.status(401).json({ success: false, valid: false });
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.headers['x-admin-token'] || (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (token) storage.deleteAdminSession(token);
  res.json({ success: true, message: 'Logged out successfully' });
});

// Protect all /api/admin/* routes
app.use('/api/admin', requireAdminAuth);

// ------------------- API ROUTES -------------------

// 1. Network & Shop QR details
app.get('/api/network-info', (req, res) => {
  const localIp = getLocalIp();
  const settings = storage.getSettings();
  const localUrl = `http://${localIp}:${PORT}`;
  const publicUrl = tunnelService.getPublicUrl() || settings.publicUrl || null;
  const webAppUrl = publicUrl || localUrl;
  
  res.json({
    localIp,
    port: PORT,
    localUrl,
    publicUrl,
    webAppUrl,
    shop: settings.shop
  });
});

// 2. Settings & Rate Card
app.get('/api/settings', (req, res) => {
  res.json(storage.getSettings());
});

app.post('/api/settings', (req, res) => {
  const updated = storage.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

app.get('/api/rates', (req, res) => {
  const settings = storage.getSettings();
  res.json({ rates: settings.rates });
});

app.post('/api/rates', (req, res) => {
  const { rates } = req.body;
  if (!rates) return res.status(400).json({ error: 'Rates payload required' });
  const updated = storage.updateSettings({ rates });
  res.json({ success: true, rates: updated.rates });
});

// 3. Printer Endpoints
app.get('/api/printers', async (req, res) => {
  try {
    const printerInfo = await printerService.listPrinters();
    res.json(printerInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/printers/defaults', (req, res) => {
  const { defaultBw, defaultColor } = req.body;
  const current = storage.getSettings();
  const updated = storage.updateSettings({
    printers: {
      ...current.printers,
      defaultBw: defaultBw || current.printers.defaultBw,
      defaultColor: defaultColor || current.printers.defaultColor
    }
  });
  res.json({ success: true, printers: updated.printers });
});

app.post('/api/printers/check-connection', async (req, res) => {
  const { printerName } = req.body;
  if (!printerName) return res.status(400).json({ error: 'Printer name is required' });
  try {
    const result = await printerService.testPrinterConnection(printerName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/printers/test-print', async (req, res) => {
  const { printerName } = req.body;
  if (!printerName) return res.status(400).json({ error: 'Printer name is required' });

  try {
    const result = await printerService.generateAndPrintTestPage(printerName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Test print failed: ${err.message}` });
  }
});

// 4. File Upload (Multiple files, no file size limit)
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedResults = [];

    for (const file of req.files) {
      let pageCount = 1;
      const ext = path.extname(file.originalname).toLowerCase();

      if (ext === '.pdf') {
        pageCount = printerService.getPdfPageCountSafely(file.path);
      }

      uploadedResults.push({
        id: uuidv4(),
        originalName: file.originalname,
        filename: file.filename,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        pageCount,
        fileUrl: `/api/files/${file.filename}`
      });
    }

    res.json({ success: true, files: uploadedResults });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cancel single uploaded file before ordering
app.post('/api/upload/cancel-file', (req, res) => {
  const { filename } = req.body || {};
  const deleted = cleanupService.deleteSingleUploadedFile(filename);
  res.json({ success: true, deleted });
});

// Purge abandoned staged uploads on window close / page refresh
app.post('/api/upload/abandon-session', (req, res) => {
  let filenames = [];
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      filenames = parsed.filenames || [];
    } catch (e) {}
  } else if (req.body && req.body.filenames) {
    filenames = req.body.filenames;
  }

  const { deletedCount } = cleanupService.deleteAbandonedFiles(filenames);
  res.json({ success: true, deletedCount });
});

// Serve uploaded file for inline preview & thumbnail generation
app.get('/api/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.sendFile(filePath);
});

// 5. Order Creation
app.post('/api/orders', (req, res) => {
  try {
    const { customer, paymentMethod, documents } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'At least one document is required' });
    }

    const order = storage.createOrder(req.body);

    // Notify admin clients live
    broadcast('ORDER_CREATED', order, 'admin_stream');

    res.json({ success: true, order });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Order Tracking
app.get('/api/orders/:id', (req, res) => {
  const order = storage.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.get('/api/orders/track-lookup/:query', (req, res) => {
  const query = req.params.query.trim();
  const byId = storage.getOrder(query);
  if (byId) return res.json({ orders: [byId] });

  const byPhone = storage.getOrdersByPhone(query);
  res.json({ orders: byPhone });
});

// 7. Admin Orders Query
app.get('/api/admin/orders', (req, res) => {
  const filter = req.query.filter || 'all';
  const orders = storage.getOrders(filter);
  res.json({ orders });
});

// 8. Order Approval & Automatic Live Printing
app.post('/api/admin/orders/:id/approve-and-print', async (req, res) => {
  const { id } = req.params;
  const { printerOverrides } = req.body || {}; // { docId: 'KONICA MINOLTA C308', ... }

  const order = storage.getOrder(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  try {
    // 1. Mark status as printing
    storage.updateOrderStatus(id, 'printing', 'Approved by Admin. Print job dispatched to local printer.');
    broadcast('ORDER_STATUS_CHANGED', { orderId: id, status: 'printing', note: 'Printing in progress' });

    // 2. Process each document and print
    const printResults = [];
    const settings = storage.getSettings();

    for (let i = 0; i < order.documents.length; i++) {
      const doc = order.documents[i];
      
      // Determine target printer: override -> doc assigned -> default color/bw
      let targetPrinter = (printerOverrides && printerOverrides[doc.id]) || doc.assignedPrinter;
      if (!targetPrinter) {
        targetPrinter = doc.colorMode === 'color' 
          ? settings.printers.defaultColor 
          : settings.printers.defaultBw;
      }

      console.log(`[Order ${id}] Preparing Doc ${i + 1}/${order.documents.length}: "${doc.originalName}" for printer "${targetPrinter}"`);

      // Prepare target PDF file with exact selected pages (supports encrypted PDFs)
      const prep = await printerService.preparePrintJobFile(doc, id, i + 1);

      // Send to real Windows printer
      const printResult = await printerService.printDocument(prep.outputPath, {
        printerName: targetPrinter,
        copies: doc.copies || 1,
        paperSize: doc.paperType || 'A4',
        isDuplex: doc.sides === 'duplex',
        isColor: doc.colorMode === 'color',
        pagesSetting: prep.pagesSetting || null
      });

      printResults.push({
        docId: doc.id,
        originalName: doc.originalName,
        printer: targetPrinter,
        paperType: doc.paperType,
        colorMode: doc.colorMode,
        sides: doc.sides,
        copies: doc.copies,
        pagesPrinted: prep.pageCount,
        timestamp: new Date().toISOString(),
        success: true
      });
    }

    // 3. Update order as Ready for Pickup
    storage.updateOrder(id, {
      printResults,
      assignedPrinter: printResults[0]?.printer || 'Default Printer'
    });
    
    const updatedOrder = storage.updateOrderStatus(
      id, 
      'ready_for_pickup', 
      `All ${order.documents.length} document(s) printed successfully. Ready for customer pickup!`
    );

    broadcast('ORDER_STATUS_CHANGED', { 
      orderId: id, 
      status: 'ready_for_pickup', 
      order: updatedOrder 
    });

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Order approved and sent to local printer!'
    });
  } catch (err) {
    console.error(`Approval/Print failed for order ${id}:`, err);
    storage.updateOrderStatus(id, 'pending_approval', `Print error: ${err.message}. Ready for re-attempt.`);
    broadcast('ORDER_STATUS_CHANGED', { 
      orderId: id, 
      status: 'pending_approval', 
      error: err.message 
    });
    res.status(500).json({ error: `Printing failed: ${err.message}` });
  }
});

// 9. Manual Order Status Update
app.post('/api/admin/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, note, paymentStatus } = req.body;

  if (paymentStatus) {
    storage.updateOrder(id, { paymentStatus });
  }

  const updated = storage.updateOrderStatus(id, status, note || '');
  if (!updated) return res.status(404).json({ error: 'Order not found' });

  broadcast('ORDER_STATUS_CHANGED', { orderId: id, status, order: updated });
  res.json({ success: true, order: updated });
});

// 10. Update Document Assigned Printer (Override persistence)
app.post('/api/admin/orders/:id/update-printer', (req, res) => {
  const { id } = req.params;
  const { docId, printer } = req.body;
  if (!printer) return res.status(400).json({ error: 'Printer name is required' });

  const updated = storage.updateDocumentPrinter(id, docId, printer);
  if (!updated) return res.status(404).json({ error: 'Order not found' });

  console.log(`[Order ${id}] Assigned printer updated to "${printer}" for doc: ${docId || 'all'}`);
  broadcast('ORDER_STATUS_CHANGED', { orderId: id, status: updated.status, order: updated });
  res.json({ success: true, order: updated, assignedPrinter: printer });
});

// 11. Delete / Clear Single Order and its uploaded files
app.delete('/api/admin/orders/:id', (req, res) => {
  const { id } = req.params;
  const deletedOrder = storage.deleteOrder(id);
  if (!deletedOrder) return res.status(404).json({ error: 'Order not found' });

  const { deletedCount } = cleanupService.deleteOrderFiles(deletedOrder);
  console.log(`[Order ${id}] Cleared from system. Removed ${deletedCount} physical file(s).`);

  broadcast('ORDER_DELETED', { orderId: id });
  res.json({
    success: true,
    message: `Order ${id} deleted and ${deletedCount} file(s) removed from disk.`,
    orderId: id
  });
});

// 12. Clear All Orders and all uploaded files
app.post('/api/admin/orders/clear-all', (req, res) => {
  const allOrders = storage.clearAllOrders();
  let totalFilesDeleted = 0;

  for (const o of allOrders) {
    const { deletedCount } = cleanupService.deleteOrderFiles(o);
    totalFilesDeleted += deletedCount;
  }

  console.log(`[ClearAll] Cleared ${allOrders.length} orders and removed ${totalFilesDeleted} files from disk.`);
  broadcast('ALL_ORDERS_CLEARED', {});
  res.json({
    success: true,
    message: `Cleared ${allOrders.length} orders and removed ${totalFilesDeleted} file(s) from disk.`,
    clearedCount: allOrders.length,
    filesDeleted: totalFilesDeleted
  });
});

// 13. Manual 24-hr Cleanup Trigger
app.post('/api/admin/cleanup-24h', (req, res) => {
  const result = cleanupService.cleanupFilesOlderThan24Hours();
  res.json({ success: true, ...result });
});

// WebSocket Connection Management
wss.on('connection', (ws, req) => {
  ws.room = null;

  ws.on('message', (msgStr) => {
    try {
      const data = JSON.parse(msgStr);
      if (data.action === 'join') {
        ws.room = data.room; // 'admin_stream' or `order:${orderId}`
      }
    } catch (e) {}
  });

  ws.send(JSON.stringify({ event: 'CONNECTED', message: 'Connected to Copycat Copiers Print Server' }));
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  cleanupService.startAutoCleanupSchedule();
  console.log(`====================================================`);
  console.log(`  COPYCAT COPIERS - WEB PRINTING SYSTEM IS ONLINE!  `);
  console.log(`====================================================`);
  console.log(`  Local Web App URL:      http://localhost:${PORT}`);
  console.log(`  Network/Mobile Web App: http://${localIp}:${PORT}`);
  console.log(`  Admin Dashboard:        http://localhost:${PORT}/admin.html`);
  console.log(`  Counter QR Stand:       http://localhost:${PORT}/qr-stand.html`);
  console.log(`====================================================`);

  // Start Cloudflare Public Internet Tunnel
  tunnelService.startTunnel(PORT, (newPublicUrl) => {
    storage.updateSettings({ publicUrl: newPublicUrl });
    broadcast('NETWORK_INFO_UPDATED', {
      publicUrl: newPublicUrl,
      webAppUrl: newPublicUrl
    });
  });
});
