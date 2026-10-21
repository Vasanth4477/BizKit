const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const net = require('node:net');
const { Pool } = require('pg');

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3100';
const base = new URL(BASE_URL);
if (base.protocol !== 'http:' || !['127.0.0.1', 'localhost', '::1'].includes(base.hostname)) {
  throw new Error('Safety stop: integration tests may only call a local HTTP server.');
}

const originalPassword = 'Password-Original-2026!';
const resetPassword = 'Password-Reset-2026!';
const changedPassword = 'Password-Changed-2026!';
const smtpMessages = [];

function startSmtpSink() {
  const server = net.createServer(socket => {
    socket.setEncoding('utf8');
    socket.write('220 bizkit-qa.local ESMTP ready\r\n');
    let buffer = '';
    let inData = false;
    let data = '';
    let authState = '';

    socket.on('error', () => {});
    socket.on('data', chunk => {
      buffer += chunk;
      while (buffer.includes('\n')) {
        const end = buffer.indexOf('\n');
        const line = buffer.slice(0, end).replace(/\r$/, '');
        buffer = buffer.slice(end + 1);

        if (inData) {
          if (line === '.') {
            inData = false;
            smtpMessages.push(data);
            data = '';
            socket.write('250 2.0.0 message accepted\r\n');
          } else {
            data += (line.startsWith('..') ? line.slice(1) : line) + '\r\n';
          }
          continue;
        }

        if (authState === 'plain') {
          authState = '';
          socket.write('235 2.7.0 authenticated\r\n');
          continue;
        }
        if (authState === 'username') {
          authState = 'password';
          socket.write('334 UGFzc3dvcmQ6\r\n');
          continue;
        }
        if (authState === 'password') {
          authState = '';
          socket.write('235 2.7.0 authenticated\r\n');
          continue;
        }

        const upper = line.toUpperCase();
        if (upper.startsWith('EHLO ') || upper.startsWith('HELO ')) {
          socket.write('250-bizkit-qa.local\r\n250-AUTH PLAIN LOGIN\r\n250 SIZE 10485760\r\n');
        } else if (upper.startsWith('AUTH PLAIN')) {
          if (line.trim().split(/\s+/).length >= 3) socket.write('235 2.7.0 authenticated\r\n');
          else {
            authState = 'plain';
            socket.write('334 \r\n');
          }
        } else if (upper.startsWith('AUTH LOGIN')) {
          authState = 'username';
          socket.write('334 VXNlcm5hbWU6\r\n');
        } else if (upper.startsWith('MAIL FROM:')) {
          socket.write('250 2.1.0 sender accepted\r\n');
        } else if (upper.startsWith('RCPT TO:')) {
          socket.write('250 2.1.5 recipient accepted\r\n');
        } else if (upper === 'DATA') {
          inData = true;
          data = '';
          socket.write('354 end with <CRLF>.<CRLF>\r\n');
        } else if (upper === 'RSET' || upper === 'NOOP') {
          socket.write('250 2.0.0 ok\r\n');
        } else if (upper === 'QUIT') {
          socket.write('221 2.0.0 bye\r\n');
          socket.end();
        } else {
          socket.write('250 2.0.0 ok\r\n');
        }
      }
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(2525, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}

async function request(method, path, options = {}) {
  const headers = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = 'Bearer ' + options.token;
  const response = await fetch(new URL(path, BASE_URL), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(12000)
  });
  const text = await response.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  return { status: response.status, body, text, headers: response.headers };
}

function status(result, expected, label) {
  assert.equal(result.status, expected,
    label + ': expected HTTP ' + expected + ', got ' + result.status + '; body=' + JSON.stringify(result.body));
  return result.body;
}

function id(value, label) {
  const parsed = Number(value);
  assert.ok(Number.isSafeInteger(parsed) && parsed > 0, label + ' should be a positive integer ID');
  return parsed;
}

async function main() {
  let smtpServer;
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
  });

  try {
    smtpServer = await startSmtpSink();

    const health = await request('GET', '/api/health');
    const healthBody = status(health, 200, 'health endpoint');
    assert.equal(healthBody.ok, true);
    assert.equal(healthBody.version, '0.8.1');
    assert.equal(health.headers.get('cache-control'), 'no-store');
    assert.ok(health.headers.get('x-request-id'), 'health response should carry a request ID');
    const forgotPage = status(await request('GET', '/forgot-password'), 200, 'forgot password page');
    assert.ok(typeof forgotPage === 'string' && forgotPage.includes('authApp'));
    const resetPage = status(await request('GET', '/reset-password?token=invalid'), 200, 'reset password page');
    assert.ok(typeof resetPage === 'string' && resetPage.includes('authApp'));

    status(await request('GET', '/api/customers'), 401, 'API must reject unauthenticated requests');
    const tooShort = status(await request('POST', '/api/auth/signup', {
      body: { name: 'QA Too Short', email: 'short-' + crypto.randomUUID() + '@example.test', password: 'short77' }
    }), 400, 'signup rejects a password shorter than eight characters');
    assert.match(tooShort.error, /8 characters/i);

    const suffix = crypto.randomUUID();
    const emailA = 'qa-a-' + suffix + '@example.test';
    const emailB = 'qa-b-' + suffix + '@example.test';
    const signupA = status(await request('POST', '/api/auth/signup', {
      body: { name: 'QA Tenant A', email: emailA, password: originalPassword }
    }), 201, 'signup tenant A');
    const signupB = status(await request('POST', '/api/auth/signup', {
      body: { name: 'QA Tenant B', email: emailB, password: originalPassword }
    }), 201, 'signup tenant B');
    const userAId = id(signupA.user.id, 'tenant A user ID');
    const userBId = id(signupB.user.id, 'tenant B user ID');
    assert.notEqual(userAId, userBId);
    let tokenA = signupA.token;
    const tokenB = signupB.token;

    status(await request('POST', '/api/auth/signup', {
      body: { name: 'Duplicate', email: emailA.toUpperCase(), password: originalPassword }
    }), 409, 'signup normalizes duplicate email');
    status(await request('POST', '/api/auth/login', {
      body: { email: emailA, password: 'wrong-password' }
    }), 401, 'bad login rejected');
    const loginA = status(await request('POST', '/api/auth/login', {
      body: { email: emailA, password: originalPassword }
    }), 200, 'tenant A login');
    const loginB = status(await request('POST', '/api/auth/login', {
      body: { email: emailB, password: originalPassword }
    }), 200, 'tenant B login');
    tokenA = loginA.token;
    assert.equal(Number(status(await request('GET', '/api/me', { token: tokenA }), 200, 'tenant A profile').user.id), userAId);

    const customerA = id(status(await request('POST', '/api/customers', {
      token: tokenA, body: { name: 'QA Customer A', phone: '9000000001', email: 'customer-a@example.test' }
    }), 201, 'create tenant A customer').id, 'customer A ID');
    const customerB = id(status(await request('POST', '/api/customers', {
      token: tokenB, body: { name: 'QA Customer B', phone: '9000000002', email: 'customer-b@example.test' }
    }), 201, 'create tenant B customer').id, 'customer B ID');

    const customersA = status(await request('GET', '/api/customers', { token: tokenA }), 200, 'tenant A customer list').customers;
    const customersB = status(await request('GET', '/api/customers', { token: tokenB }), 200, 'tenant B customer list').customers;
    assert.deepEqual(customersA.map(x => Number(x.id)), [customerA]);
    assert.deepEqual(customersB.map(x => Number(x.id)), [customerB]);
    status(await request('GET', '/api/customers/' + customerA, { token: tokenB }), 404, 'tenant B cannot read tenant A customer');
    status(await request('PUT', '/api/customers/' + customerA, { token: tokenB, body: { name: 'Stolen edit' } }), 404, 'tenant B cannot edit tenant A customer');
    status(await request('DELETE', '/api/customers/' + customerA, { token: tokenB }), 404, 'tenant B cannot delete tenant A customer');

    const productA = id(status(await request('POST', '/api/products', {
      token: tokenA,
      body: { name: 'QA Product', sku: 'QA-' + suffix.slice(0, 8), price: 100, purchasePrice: 50, gstRate: 18, stock: 10, lowStockThreshold: 2, trackStock: true }
    }), 201, 'create tenant A product').id, 'product A ID');
    assert.equal(status(await request('GET', '/api/products', { token: tokenB }), 200, 'tenant B product list').products.length, 0);
    status(await request('GET', '/api/products/' + productA, { token: tokenB }), 404, 'tenant B cannot read tenant A product');
    status(await request('POST', '/api/products/' + productA + '/adjust-stock', {
      token: tokenA, body: { type: 'out', quantity: 99, note: 'QA overdraw attempt' }
    }), 400, 'inventory rejects a negative stock outcome');
    status(await request('POST', '/api/products/' + productA + '/adjust-stock', {
      token: tokenA, body: { type: 'out', quantity: 2, note: 'QA stock adjustment' }
    }), 200, 'valid inventory adjustment');

    const invoicePayload = {
      invoiceNo: 'QA-' + suffix.slice(0, 12),
      invoiceDate: '2026-01-01',
      dueDate: '2099-12-31',
      customerId: customerA,
      customerName: 'QA Customer A',
      gstRate: 18,
      discount: 0,
      items: [{ productId: productA, name: 'QA Product', qty: 2, rate: 100, gstRate: 18 }]
    };
    const invoiceA = status(await request('POST', '/api/invoices', { token: tokenA, body: invoicePayload }), 201, 'create invoice').id;
    const invoiceId = id(invoiceA, 'invoice A ID');
    const invoiceTotal = Number((await request('GET', '/api/invoices/' + invoiceId, { token: tokenA })).body.invoice.total);
    assert.equal(invoiceTotal, 236);
    status(await request('POST', '/api/invoices', { token: tokenA, body: invoicePayload }), 409, 'duplicate invoice number rejected');
    status(await request('GET', '/api/invoices/' + invoiceId, { token: tokenB }), 404, 'tenant B cannot read tenant A invoice');

    const editedPayload = { ...invoicePayload, items: [{ productId: productA, name: 'QA Product', qty: 3, rate: 100, gstRate: 18 }] };
    const edited = status(await request('PUT', '/api/invoices/' + invoiceId, { token: tokenA, body: editedPayload }), 200, 'edit invoice');
    assert.equal(Number(edited.total), 354);
    let productDetails = status(await request('GET', '/api/products/' + productA, { token: tokenA }), 200, 'product after invoice edit').product;
    assert.equal(Number(productDetails.stock), 5);

    status(await request('POST', '/api/payments', {
      token: tokenA, body: { invoiceId, customerId: customerA, amount: 355, method: 'UPI', reference: 'QA-OVERPAY' }
    }), 400, 'invoice overpayment rejected');
    const paymentId = id(status(await request('POST', '/api/payments', {
      token: tokenA, body: { invoiceId, customerId: customerA, amount: 100, method: 'UPI', reference: 'QA-PAYMENT', paidAt: '2026-01-01' }
    }), 201, 'record partial payment').id, 'payment ID');
    let invoiceDetails = status(await request('GET', '/api/invoices/' + invoiceId, { token: tokenA }), 200, 'invoice after payment').invoice;
    assert.equal(Number(invoiceDetails.paid), 100);
    assert.equal(Number(invoiceDetails.balance), 254);
    assert.equal(invoiceDetails.status, 'partial');
    assert.equal(status(await request('GET', '/api/payments', { token: tokenB }), 200, 'tenant B payments list').payments.length, 0);
    status(await request('POST', '/api/payments/' + paymentId + '/reverse', { token: tokenA, body: { note: 'QA reversal' } }), 200, 'reverse payment');
    status(await request('POST', '/api/payments/' + paymentId + '/reverse', { token: tokenA, body: { note: 'duplicate reversal' } }), 409, 'duplicate payment reversal rejected');
    invoiceDetails = status(await request('GET', '/api/invoices/' + invoiceId, { token: tokenA }), 200, 'invoice after reversal').invoice;
    assert.equal(Number(invoiceDetails.paid), 0);
    assert.equal(invoiceDetails.status, 'unpaid');

    const quoteId = id(status(await request('POST', '/api/quotations', {
      token: tokenA,
      body: {
        quoteNo: 'QA-Q-' + suffix.slice(0, 10), quoteDate: '2026-01-01', validUntil: '2099-12-31',
        customerId: customerA, customerName: 'QA Customer A', gstRate: 18,
        items: [{ productId: productA, name: 'QA Product', qty: 1, rate: 100, gstRate: 18 }]
      }
    }), 201, 'create quotation').id, 'quotation ID');
    status(await request('PATCH', '/api/quotations/' + quoteId + '/status', {
      token: tokenA, body: { status: 'accepted' }
    }), 200, 'accept quotation');
    status(await request('PATCH', '/api/quotations/' + quoteId + '/status', {
      token: tokenB, body: { status: 'rejected' }
    }), 404, 'tenant B cannot change tenant A quotation');
    const converted = status(await request('POST', '/api/quotations/' + quoteId + '/convert-to-invoice', { token: tokenA, body: {} }), 201, 'convert quotation to invoice');
    const convertedId = id(converted.id, 'converted invoice ID');
    status(await request('POST', '/api/quotations/' + quoteId + '/convert-to-invoice', { token: tokenA, body: {} }), 409, 'duplicate quote conversion rejected');
    status(await request('GET', '/api/invoices/' + convertedId, { token: tokenB }), 404, 'tenant B cannot read converted invoice');

    const supplierA = id(status(await request('POST', '/api/suppliers', {
      token: tokenA, body: { name: 'QA Supplier A', email: 'supplier-a@example.test' }
    }), 201, 'create supplier').id, 'supplier ID');
    status(await request('GET', '/api/suppliers/' + supplierA, { token: tokenB }), 404, 'tenant B cannot read tenant A supplier');
    const purchaseId = id(status(await request('POST', '/api/purchases', {
      token: tokenA,
      body: {
        purchaseNo: 'QA-P-' + suffix.slice(0, 10), purchaseDate: '2026-01-01',
        supplierId: supplierA, supplierName: 'QA Supplier A', gstRate: 18,
        items: [{ productId: productA, name: 'QA Product', qty: 3, rate: 50 }]
      }
    }), 201, 'create purchase').id, 'purchase ID');
    assert.equal(status(await request('GET', '/api/purchases', { token: tokenB }), 200, 'tenant B purchases').purchases.length, 0);
    status(await request('GET', '/api/purchases/' + purchaseId, { token: tokenB }), 404, 'tenant B cannot read tenant A purchase');
    status(await request('POST', '/api/purchases/' + purchaseId + '/cancel', { token: tokenA, body: {} }), 200, 'cancel purchase and reconcile stock');
    status(await request('POST', '/api/purchases/' + purchaseId + '/cancel', { token: tokenA, body: {} }), 409, 'duplicate purchase cancellation rejected');
    productDetails = status(await request('GET', '/api/products/' + productA, { token: tokenA }), 200, 'final product stock').product;
    assert.equal(Number(productDetails.stock), 4);

    status(await request('DELETE', '/api/customers/' + customerA, { token: tokenA }), 409, 'customer with invoice history cannot be deleted');
    status(await request('DELETE', '/api/products/' + productA, { token: tokenA }), 409, 'product referenced by documents cannot be deleted');
    status(await request('DELETE', '/api/suppliers/' + supplierA, { token: tokenA }), 409, 'supplier with purchase history cannot be deleted');

    const expenseA = id(status(await request('POST', '/api/expenses', {
      token: tokenA, body: { expenseDate: '2026-01-01', category: 'QA', amount: 25, note: 'ephemeral E2E test' }
    }), 201, 'create tenant A expense').id, 'expense A ID');
    status(await request('POST', '/api/expenses', {
      token: tokenB, body: { expenseDate: '2026-01-01', category: 'QA', amount: 40, note: 'ephemeral E2E test' }
    }), 201, 'create tenant B expense');
    const expensesA = status(await request('GET', '/api/expenses', { token: tokenA }), 200, 'tenant A expenses').expenses;
    const expensesB = status(await request('GET', '/api/expenses', { token: tokenB }), 200, 'tenant B expenses').expenses;
    assert.deepEqual(expensesA.map(x => Number(x.id)), [expenseA]);
    assert.equal(expensesB.length, 1);
    assert.equal(status(await request('GET', '/api/invoices', { token: tokenB }), 200, 'tenant B invoice list').invoices.length, 0);

    const unknownForgot = status(await request('POST', '/api/auth/forgot-password', {
      body: { email: 'missing-' + suffix + '@example.test' }
    }), 202, 'unknown email reset request');
    const knownForgot = status(await request('POST', '/api/auth/forgot-password', {
      body: { email: emailA }
    }), 202, 'known email reset request');
    assert.equal(unknownForgot.message, knownForgot.message, 'password reset must not reveal whether an email exists');
    assert.equal(smtpMessages.length, 1, 'a reset email should be delivered to the SMTP test sink');
    assert.ok(smtpMessages[0].includes(emailA), 'reset email should target the account email');
    const normalizedMail = smtpMessages[0].replace(/=\r?\n/g, '');
    const tokenMatch = normalizedMail.match(/http:\/\/127\.0\.0\.1:3100\/reset-password\?token=([a-f0-9]{64})/i);
    assert.ok(tokenMatch, 'reset email should contain a 64-character token link');
    const resetToken = tokenMatch[1];
    assert.ok(!JSON.stringify(knownForgot).includes(resetToken), 'reset token must not be returned by the API');

    const tokenRow = (await db.query(
      'SELECT token_hash,expires_at,used_at FROM password_reset_tokens WHERE user_id=$1 ORDER BY id DESC LIMIT 1',
      [userAId]
    )).rows[0];
    assert.ok(tokenRow, 'password reset token should be persisted');
    assert.equal(tokenRow.token_hash, crypto.createHash('sha256').update(resetToken).digest('hex'), 'only a SHA-256 token hash should be stored');
    assert.ok(new Date(tokenRow.expires_at).getTime() > Date.now(), 'reset token should not be expired at creation');
    assert.equal(tokenRow.used_at, null);

    const reset = status(await request('POST', '/api/auth/reset-password', {
      body: { token: resetToken, newPassword: resetPassword }
    }), 200, 'reset password from emailed token');
    assert.equal(reset.ok, true);
    assert.ok((await db.query('SELECT used_at FROM password_reset_tokens WHERE token_hash=$1', [tokenRow.token_hash])).rows[0].used_at);
    status(await request('POST', '/api/auth/reset-password', {
      body: { token: resetToken, newPassword: 'Password-Again-2026!' }
    }), 400, 'reset token can only be used once');
    status(await request('GET', '/api/me', { token: tokenA }), 401, 'password reset invalidates existing sessions');

    status(await request('POST', '/api/auth/login', {
      body: { email: emailA, password: originalPassword }
    }), 401, 'old password no longer works after reset');
    const resetLogin = status(await request('POST', '/api/auth/login', {
      body: { email: emailA, password: resetPassword }
    }), 200, 'new password works after reset');
    assert.ok(resetLogin.token);
    const changed = status(await request('POST', '/api/auth/change-password', {
      token: reset.token,
      body: { currentPassword: resetPassword, newPassword: changedPassword }
    }), 200, 'change password');
    status(await request('GET', '/api/me', { token: reset.token }), 401, 'password change invalidates previous session');
    assert.equal(Number(status(await request('GET', '/api/me', { token: changed.token }), 200, 'new session after password change').user.id), userAId);
    status(await request('POST', '/api/auth/login', {
      body: { email: emailA, password: changedPassword }
    }), 200, 'changed password works for login');

    assert.equal(status(await request('GET', '/api/invoices', { token: tokenB }), 200, 'tenant B access remains healthy').invoices.length, 0);
    console.log('BizKit E2E passed: auth, tenant isolation, inventory, invoices, payments, quotes, purchases, expenses, SMTP reset delivery, token reuse, and session revocation.');
  } finally {
    await db.end();
    if (smtpServer) await new Promise(resolve => smtpServer.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
