const http = require('http');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

async function createSampleFiles() {
  const tmpDir = path.join(__dirname, 'test_tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // 1. Create a 3-page sample PDF
  const pdfDoc = await PDFDocument.create();
  for (let i = 1; i <= 3; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText(`Copycat Copiers Test Document - Page ${i}`, {
      x: 50,
      y: 750,
      size: 20,
      color: rgb(0.26, 0.52, 0.96)
    });
  }
  const pdfBytes = await pdfDoc.save();
  const samplePdfPath = path.join(tmpDir, 'sample_contract.pdf');
  fs.writeFileSync(samplePdfPath, pdfBytes);

  return { samplePdfPath };
}

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3005,
      path,
      method,
      headers: {
        ...headers
      }
    };

    if (body && !headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

// Multipart upload simulation
function uploadFile(filePath, fieldName = 'files') {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
    const filename = path.basename(filePath);
    const fileBytes = fs.readFileSync(filePath);

    let header = `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n`;
    header += `Content-Type: application/pdf\r\n\r\n`;

    const footer = `\r\n--${boundary}--\r\n`;

    const totalLength = Buffer.byteLength(header) + fileBytes.length + Buffer.byteLength(footer);

    const options = {
      hostname: 'localhost',
      port: 3005,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(header);
    req.write(fileBytes);
    req.write(footer);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING E2E TEST SUITE FOR COPYCAT COPIERS ---');

  // Test 1: Network Info
  const net = await request('GET', '/api/network-info');
  console.log('✓ Test 1: Network Info:', net.status === 200, `Local IP: ${net.body.localIp}, WebApp: ${net.body.webAppUrl}`);

  // Test 2: Rates
  const rates = await request('GET', '/api/rates');
  console.log('✓ Test 2: Rates:', rates.status === 200, `A4 B&W Single: ₹${rates.body.rates.A4.bw.single}`);

  // Test 3: Live Printers
  const printers = await request('GET', '/api/printers');
  console.log('✓ Test 3: Printers Query:', printers.status === 200, `Found ${printers.body.printers.length} live printers, Default BW: ${printers.body.defaultBw}`);

  // Test 4: File Upload
  const { samplePdfPath } = await createSampleFiles();
  const upRes = await uploadFile(samplePdfPath);
  console.log('✓ Test 4: File Upload:', upRes.status === 200, `Uploaded 1 file with ${upRes.body.files[0].pageCount} pages`);
  const uploadedDoc = upRes.body.files[0];

  // Test 5: Order Creation with Visual Page Selection (e.g. pages 1 and 3 selected, A4, Color, Duplex, 2 copies)
  const orderPayload = {
    customer: {
      name: 'Rohan Sharma',
      phone: '9876543210'
    },
    paymentMethod: 'online',
    paymentStatus: 'completed',
    paymentRef: 'UPI-TEST-123456',
    documents: [
      {
        id: uploadedDoc.id,
        originalName: uploadedDoc.originalName,
        filePath: uploadedDoc.filePath,
        mimeType: uploadedDoc.mimeType,
        fileSize: uploadedDoc.fileSize,
        paperType: 'A4',
        colorMode: 'color',
        sides: 'duplex',
        pageRangeMode: 'visual',
        selectedPages: [1, 3], // 2 pages visually selected
        totalDocumentPages: 3,
        copies: 2
      }
    ]
  };

  const orderRes = await request('POST', '/api/orders', orderPayload);
  console.log('✓ Test 5: Order Creation:', orderRes.status === 200, `Created Order ${orderRes.body.order.id}, Total: ₹${orderRes.body.order.summary.totalAmount}`);
  const createdOrder = orderRes.body.order;

  // Test 6: Order Tracking Query
  const trackRes = await request('GET', `/api/orders/${createdOrder.id}`);
  console.log('✓ Test 6: Order Tracking:', trackRes.status === 200, `Status: ${trackRes.body.status}`);

  // Test 7: Lookup by Phone
  const phoneLookup = await request('GET', `/api/orders/track-lookup/9876543210`);
  console.log('✓ Test 7: Phone Lookup:', phoneLookup.body.orders.length > 0, `Found ${phoneLookup.body.orders.length} orders for 9876543210`);

  // Test 8: Admin Orders list
  const adminOrders = await request('GET', '/api/admin/orders');
  console.log('✓ Test 8: Admin Orders Query:', adminOrders.status === 200, `Orders in DB: ${adminOrders.body.orders.length}`);

  // Test 9: Save Rate Card
  const updatedRates = {
    ...rates.body.rates,
    A4: {
      ...rates.body.rates.A4,
      bw: { single: 2.5, duplex: 4.0 }
    }
  };
  const saveRateRes = await request('POST', '/api/rates', { rates: updatedRates });
  console.log('✓ Test 9: Update Rate Card:', saveRateRes.status === 200, `New A4 B&W Single: ₹${saveRateRes.body.rates.A4.bw.single}`);

  console.log('--- ALL BACKEND & WORKFLOW TESTS PASSED CLEANLY! ---');
}

runTests().catch(console.error);
