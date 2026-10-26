const SUPABASE_URL = "https://uklivylyenatdqbgmcxy.supabase.co";
const SUPABASE_KEY = "sb_publishable_ntlKWYQvMXlCs_obIEVIIA_-CfxOFTJ";
const WHATSAPP_NUMBER = "201070845123";
const PRODUCTS = {
  1: { id: 1, name: "منتج رقم 1", price: 100 },
  2: { id: 2, name: "منتج رقم 2", price: 200 },
  3: { id: 3, name: "منتج رقم 3", price: 400 },
  4: { id: 4, name: "منتج رقم 4", price: 500 }
};
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
let cart = loadCart();
let trackingTimer = null;
let pendingPhone = "";

function loadCart() {
  try {
    const value = JSON.parse(localStorage.getItem("store-cart") || "[]");
    return Array.isArray(value) ? value.filter(x => PRODUCTS[x.id] && Number.isInteger(x.quantity) && x.quantity > 0 && x.quantity <= 20) : [];
  } catch { return []; }
}
function saveCart() {
  localStorage.setItem("store-cart", JSON.stringify(cart));
  renderCart();
}
function addToCart(id) {
  const product = PRODUCTS[id];
  if (!product) return;
  const existing = cart.find(x => x.id === id);
  if (existing) {
    if (existing.quantity >= 20) return alert("الحد الأقصى 20 قطعة من المنتج الواحد.");
    existing.quantity += 1;
  } else cart.push({ id, quantity: 1 });
  saveCart();
  document.getElementById("cartSection").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function renderCart() {
  const container = document.getElementById("cartItems");
  if (!container) return;
  container.replaceChildren();
  let total = 0, count = 0;
  if (!cart.length) {
    const p = document.createElement("p"); p.textContent = "السلة فاضية، أضف منتج من المنتجات فوق."; container.appendChild(p);
  }
  cart.forEach(item => {
    const product = PRODUCTS[item.id];
    if (!product) return;
    total += product.price * item.quantity; count += item.quantity;
    const row = document.createElement("div"); row.className = "cart-row";
    const info = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = product.name;
    const price = document.createElement("p"); price.textContent = product.price + " جنيه للقطعة";
    info.append(title, price);
    const controls = document.createElement("div"); controls.className = "cart-controls";
    const minus = document.createElement("button"); minus.className = "dark"; minus.textContent = "−"; minus.setAttribute("aria-label", "تقليل الكمية"); minus.onclick = () => changeQuantity(item.id, -1);
    const qty = document.createElement("span"); qty.textContent = item.quantity;
    const plus = document.createElement("button"); plus.textContent = "+"; plus.setAttribute("aria-label", "زيادة الكمية"); plus.onclick = () => changeQuantity(item.id, 1);
    const remove = document.createElement("button"); remove.className = "remove-button"; remove.textContent = "حذف"; remove.onclick = () => { cart = cart.filter(x => x.id !== item.id); saveCart(); };
    controls.append(minus, qty, plus, remove); row.append(info, controls); container.appendChild(row);
  });
  document.getElementById("cartCount").textContent = count;
  document.getElementById("cartTotal").textContent = total + " جنيه";
  document.getElementById("checkoutButton").disabled = !cart.length;
}
function changeQuantity(id, delta) {
  const item = cart.find(x => x.id === id); if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(x => x.id !== id);
  else if (item.quantity > 20) { item.quantity = 20; alert("الحد الأقصى 20 قطعة."); }
  saveCart();
}
function clearCart() {
  if (!cart.length) return;
  if (confirm("متأكد إنك عايز تفضّي السلة؟")) { cart = []; saveCart(); }
}
function scrollToSection(id) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
function openCheckout() {
  if (!cart.length) return alert("أضف منتج للسلة الأول.");
  const summary = cart.map(x => PRODUCTS[x.id].name + " × " + x.quantity).join("، ");
  const total = cart.reduce((sum, x) => sum + PRODUCTS[x.id].price * x.quantity, 0);
  document.getElementById("checkoutSummary").textContent = summary + " — الإجمالي " + total + " جنيه";
  document.getElementById("orderSection").classList.remove("hidden");
  document.getElementById("orderSection").scrollIntoView({ behavior: "smooth" });
}
function normalizeEgyptianPhone(input) {
  let digits = String(input || "").trim().replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  digits = digits.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) return "+20" + digits.slice(1);
  if (digits.startsWith("20")) return "+" + digits;
  return "+" + digits;
}
async function sendPhoneCode() {
  const raw = document.getElementById("authPhone").value.trim();
  const phone = normalizeEgyptianPhone(raw);
  const message = document.getElementById("authMessage");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) { message.textContent = "اكتب رقم موبايل صحيح مع كود الدولة."; return; }
  const button = document.getElementById("sendOtpButton");
  button.disabled = true; button.textContent = "جاري إرسال الكود...";
  message.textContent = "";
  try {
    const { error } = await supabaseClient.auth.signInWithOtp({ phone });
    if (error) throw error;
    pendingPhone = phone;
    document.getElementById("otpStep").classList.remove("hidden");
    message.textContent = "لو إعدادات SMS مفعّلة، هيوصلك كود التحقق. اكتب الكود هنا.";
  } catch (error) {
    console.error("Phone OTP error:", error);
    message.textContent = "تعذر إرسال الكود. راجع إعدادات Phone Auth ومزوّد SMS في Supabase، ثم جرّب تاني.";
  } finally { button.disabled = false; button.textContent = "إرسال كود التحقق"; }
}
async function verifyPhoneCode() {
  const token = document.getElementById("authOtp").value.trim();
  const message = document.getElementById("authMessage");
  if (!pendingPhone || !token) { message.textContent = "اكتب رقم الموبايل و كود التحقق الأول."; return; }
  const button = document.getElementById("verifyOtpButton");
  button.disabled = true; button.textContent = "جاري التأكيد...";
  try {
    const { data, error } = await supabaseClient.auth.verifyOtp({ phone: pendingPhone, token, type: "sms" });
    if (error) throw error;
    document.getElementById("customerPhone").value = pendingPhone;
    message.textContent = "تم تسجيل الدخول بنجاح.";
    document.getElementById("authStatus").textContent = "تم تسجيل الدخول برقم " + pendingPhone;
    document.getElementById("logoutButton").classList.remove("hidden");
    document.getElementById("otpStep").classList.add("hidden");
    document.getElementById("authOtp").value = "";
    if (data.user) {
      const { error: profileError } = await supabaseClient.from("customer_profiles").upsert(
        { id: data.user.id, phone: pendingPhone }, { onConflict: "id" }
      );
      if (profileError) console.warn("Customer profile was not saved:", profileError.message);
    }
  } catch (error) {
    console.error("OTP verification error:", error);
    message.textContent = "الكود غير صحيح أو انتهت صلاحيته. اطلب كود جديد وحاول مرة أخرى.";
  } finally { button.disabled = false; button.textContent = "تأكيد الدخول"; }
}
async function refreshAuthState() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session?.user;
  if (user?.phone) {
    document.getElementById("authStatus").textContent = "تم تسجيل الدخول برقم " + user.phone;
    document.getElementById("customerPhone").value = user.phone;
    document.getElementById("logoutButton").classList.remove("hidden");
  }
}
async function logoutCustomer() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) { document.getElementById("authMessage").textContent = "تعذر تسجيل الخروج. حاول مرة أخرى."; return; }
  document.getElementById("authStatus").textContent = "تقدر تطلب كضيف أو تسجل دخولك برقم الموبايل.";
  document.getElementById("authMessage").textContent = "تم تسجيل الخروج.";
  document.getElementById("logoutButton").classList.add("hidden");
}
async function sendOrder() {
  if (!cart.length) return alert("السلة فاضية.");
  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const address = document.getElementById("customerAddress").value.trim();
  const file = document.getElementById("paymentProof").files[0];
  if (!name || !phone || !address) return alert("اكتب الاسم ورقم الموبايل والعنوان بالتفصيل.");
  if (!file) return alert("ارفع صورة إثبات الدفع.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return alert("الصورة لازم تكون JPG أو PNG أو WEBP.");
  if (file.size > 5 * 1024 * 1024) return alert("الحد الأقصى للصورة 5 ميجابايت.");
  const button = document.getElementById("sendOrderButton");
  button.disabled = true; button.textContent = "جاري إرسال الطلب...";
  let filePath = "";
  try {
    const fileId = crypto.randomUUID();
    const ext = file.name.split(".").pop().toLowerCase();
    filePath = "orders/" + fileId + "." + ext;
    const { error: uploadError } = await supabaseClient.storage.from("payment-proofs").upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const payload = cart.map(item => ({ id: item.id, quantity: item.quantity }));
    const { data: orderNumber, error: orderError } = await supabaseClient.rpc("create_cart_order", {
      p_items: payload, p_customer_name: name, p_customer_phone: phone,
      p_customer_address: address, p_payment_proof_url: filePath
    });
    if (orderError) throw orderError;
    document.getElementById("newOrderNumber").textContent = orderNumber;
    document.getElementById("orderResult").classList.remove("hidden");
    document.getElementById("trackingNumber").value = orderNumber;
    const total = cart.reduce((sum, item) => sum + PRODUCTS[item.id].price * item.quantity, 0);
    const message = "طلب جديد من متجر اختبار\nرقم الطلب: " + orderNumber + "\nالمنتجات: " +
      cart.map(item => PRODUCTS[item.id].name + " × " + item.quantity).join("، ") +
      "\nالإجمالي: " + total + " جنيه\nاسم العميل: " + name + "\nرقم الموبايل: " + phone +
      "\nالعنوان: " + address + "\nالحالة: قيد المراجعة";
    window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message), "_blank");
    cart = []; saveCart();
    document.getElementById("customerName").value = "";
    document.getElementById("customerPhone").value = "";
    document.getElementById("customerAddress").value = "";
    document.getElementById("paymentProof").value = "";
    trackOrder();
  } catch (error) {
    console.error("Order creation error:", error);
    if (filePath) await supabaseClient.storage.from("payment-proofs").remove([filePath]).catch(() => {});
    alert("تعذر تسجيل الطلب: " + (error.message || "خطأ غير معروف"));
  } finally { button.disabled = false; button.textContent = "إرسال الطلب"; }
}
async function trackOrder() {
  const number = document.getElementById("trackingNumber").value.trim();
  const message = document.getElementById("trackingMessage");
  const result = document.getElementById("trackingResult");
  if (!number) { message.textContent = "اكتب رقم الطلب."; result.replaceChildren(); return; }
  message.textContent = "جاري البحث..."; result.replaceChildren();
  try {
    const { data, error } = await supabaseClient.rpc("get_order_tracking", { p_order_number: number });
    if (error) throw error;
    if (!data?.length) { message.textContent = "رقم الطلب غير موجود."; return; }
    message.textContent = "";
    const order = data[0];
    const statuses = [["pending", "قيد المراجعة"], ["confirmed", "تم تأكيد الطلب"], ["preparing", "جاري تجهيز الطلب"], ["shipped", "تم شحن الطلب"], ["delivered", "تم تسليم الطلب"]];
    const current = statuses.findIndex(x => x[0] === order.status);
    const card = document.createElement("div"); card.className = "tracking-card";
    const heading = document.createElement("h3"); heading.textContent = order.order_number; card.appendChild(heading);
    const product = document.createElement("p"); product.textContent = "المنتجات: " + order.product_name; card.appendChild(product);
    const price = document.createElement("p"); price.textContent = "الإجمالي: " + order.product_price + " جنيه"; card.appendChild(price);
    statuses.forEach((item, i) => {
      const step = document.createElement("div"); step.className = "step" + (i <= current ? " active" : "");
      const icon = document.createElement("i"); icon.textContent = i <= current ? "✓" : "";
      const label = document.createElement("strong"); label.textContent = item[1];
      step.append(icon, label); card.appendChild(step);
    });
    result.appendChild(card);
  } catch (error) {
    console.error("Tracking error:", error);
    message.textContent = "حصل خطأ أثناء البحث. تأكد من رقم الطلب وحاول تاني.";
  }
}
function refreshTracking() { trackOrder(); }
function focusTracking() { scrollToSection("trackingSection"); document.getElementById("trackingNumber").focus(); }
function startAutoRefresh() {
  clearInterval(trackingTimer);
  trackingTimer = setInterval(() => { if (document.getElementById("trackingNumber").value.trim()) trackOrder(); }, 15000);
}
renderCart();
refreshAuthState();
startAutoRefresh();
