const SUPABASE_URL =
    "https://uklivylyenatdqbgmcxy.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_ntlKWYQvMXlCs_obIEVIIA_-CfxOFTJ";

const WHATSAPP_NUMBER =
    "201070845123";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        }
    );

let selectedProduct = null;
let trackingTimer = null;


function openOrder(id, name, price) {
    selectedProduct = {
        id,
        name,
        price
    };

    document.getElementById("selectedProduct").textContent =
        `${name} - ${price} جنيه`;

    document.getElementById("orderSection")
        .classList.remove("hidden");

    document.getElementById("orderSection")
        .scrollIntoView({ behavior: "smooth" });
}


async function sendOrder() {

    if (!selectedProduct) {
        alert("اختار منتج أولاً.");
        return;
    }

    const name =
        document.getElementById("customerName").value.trim();

    const phone =
        document.getElementById("customerPhone").value.trim();

    const address =
        document.getElementById("customerAddress").value.trim();

    const file =
        document.getElementById("paymentProof").files[0];

    if (!name || !phone || !address) {
        alert("اكتب كل بيانات العميل.");
        return;
    }

    if (!file) {
        alert("ارفع صورة إثبات الدفع.");
        return;
    }

    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
        alert("الصورة يجب أن تكون JPG أو PNG أو WEBP.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("الحد الأقصى للصورة 5 ميجابايت.");
        return;
    }

    const button =
        document.getElementById("sendOrderButton");

    button.disabled = true;
    button.textContent = "جاري إرسال الطلب...";

    try {

        const fileId = crypto.randomUUID();

        const ext =
            file.name.split(".").pop().toLowerCase();

        const filePath =
            `orders/${fileId}.${ext}`;


        const { error: uploadError } =
            await supabaseClient.storage
                .from("payment-proofs")
                .upload(filePath, file, {
                    contentType: file.type,
                    upsert: false
                });

        if (uploadError) {
            throw uploadError;
        }


        const { data: orderNumber, error: orderError } =
            await supabaseClient.rpc(
                "create_order",
                {
                    p_product_id: selectedProduct.id,
                    p_product_name: selectedProduct.name,
                    p_product_price: selectedProduct.price,
                    p_customer_name: name,
                    p_customer_phone: phone,
                    p_customer_address: address,
                    p_payment_proof_url: filePath
                }
            );

        if (orderError) {

            await supabaseClient.storage
                .from("payment-proofs")
                .remove([filePath]);

            throw orderError;
        }


        document.getElementById("newOrderNumber").textContent =
            orderNumber;

        document.getElementById("orderResult")
            .classList.remove("hidden");


        document.getElementById("trackingNumber").value =
            orderNumber;


        const message = `
طلب جديد من متجر اختبار

رقم الطلب:
${orderNumber}

المنتج:
${selectedProduct.name}

السعر:
${selectedProduct.price} جنيه

اسم العميل:
${name}

رقم الموبايل:
${phone}

العنوان:
${address}

الحالة:
قيد المراجعة
`;

        window.open(
            `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
            "_blank"
        );


        document.getElementById("customerName").value = "";
        document.getElementById("customerPhone").value = "";
        document.getElementById("customerAddress").value = "";
        document.getElementById("paymentProof").value = "";

        trackOrder();

    } catch (error) {

        console.error(error);

        alert(
            "حصل خطأ:\n\n" +
            (error.message || "خطأ غير معروف")
        );

    } finally {

        button.disabled = false;
        button.textContent = "إرسال الطلب";
    }
}


async function trackOrder() {

    const number =
        document.getElementById("trackingNumber")
            .value
            .trim();

    const message =
        document.getElementById("trackingMessage");

    const result =
        document.getElementById("trackingResult");

    if (!number) {
        message.textContent = "اكتب رقم الطلب.";
        result.innerHTML = "";
        return;
    }

    message.textContent = "جاري البحث...";
    result.innerHTML = "";

    const { data, error } =
        await supabaseClient.rpc(
            "get_order_tracking",
            {
                p_order_number: number
            }
        );

    if (error) {
        console.error(error);
        message.textContent =
            "حصل خطأ أثناء البحث.";
        return;
    }

    if (!data || !data.length) {
        message.textContent =
            "رقم الطلب غير موجود.";
        return;
    }

    message.textContent = "";

    const order = data[0];

    const statuses = [
        ["pending", "قيد المراجعة"],
        ["confirmed", "تم تأكيد الطلب"],
        ["preparing", "جاري تجهيز الطلب"],
        ["shipped", "تم شحن الطلب"],
        ["delivered", "تم تسليم الطلب"]
    ];

    const current =
        statuses.findIndex(x => x[0] === order.status);

    result.innerHTML = `
        <div class="tracking-card">
            <h3>${order.order_number}</h3>

            <p>
                <strong>المنتج:</strong>
                ${order.product_name}
            </p>

            <p>
                <strong>السعر:</strong>
                ${order.product_price} جنيه
            </p>

            ${statuses.map((item, i) => `
                <div class="step ${i <= current ? "active" : ""}">
                    <i>${i <= current ? "✓" : ""}</i>
                    <strong>${item[1]}</strong>
                </div>
            `).join("")}
        </div>
    `;
}


function refreshTracking() {
    trackOrder();
}


function focusTracking() {
    document.getElementById("trackingSection")
        .scrollIntoView({ behavior: "smooth" });

    document.getElementById("trackingNumber").focus();
}


function startAutoRefresh() {

    clearInterval(trackingTimer);

    trackingTimer = setInterval(() => {

        const number =
            document.getElementById("trackingNumber").value.trim();

        if (number) {
            trackOrder();
        }

    }, 15000);
}

startAutoRefresh();
