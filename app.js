const SUPABASE_URL =
    "https://uklivylyenatdqbgmcxy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_ntlKWYQvMXlCs_obIEVIIA_-CfxOFTJ";

const WHATSAPP_NUMBER =
    "201070845123";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
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


/* =========================
   اختيار المنتج
========================= */

function openOrder(
    productId,
    productName,
    productPrice
) {

    selectedProduct = {
        id: productId,
        name: productName,
        price: productPrice
    };


    document.getElementById(
        "selectedProduct"
    ).innerText =
        `المنتج المختار: ${productName} - ${productPrice} جنيه`;


    document.getElementById(
        "orderSection"
    ).style.display = "block";


    document.getElementById(
        "orderResult"
    ).style.display = "none";


    document.getElementById(
        "orderSection"
    ).scrollIntoView({
        behavior: "smooth"
    });
}


/* =========================
   إرسال الطلب
========================= */

async function sendOrder() {

    if (!selectedProduct) {
        alert("من فضلك اختار منتج أولاً.");
        return;
    }


    const name =
        document
            .getElementById("customerName")
            .value
            .trim();


    const phone =
        document
            .getElementById("customerPhone")
            .value
            .trim();


    const address =
        document
            .getElementById("customerAddress")
            .value
            .trim();


    const paymentFile =
        document
            .getElementById("paymentProof")
            .files[0];


    if (!name) {
        alert("من فضلك اكتب الاسم.");
        return;
    }


    if (!phone) {
        alert("من فضلك اكتب رقم الموبايل.");
        return;
    }


    if (!address) {
        alert("من فضلك اكتب العنوان.");
        return;
    }


    if (!paymentFile) {
        alert("من فضلك ارفع صورة إثبات الدفع.");
        return;
    }


    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (!allowedTypes.includes(paymentFile.type)) {

        alert(
            "نوع الصورة غير مسموح.\n\n" +
            "المسموح: JPG أو PNG أو WEBP"
        );

        return;
    }


    if (paymentFile.size > 5 * 1024 * 1024) {

        alert(
            "حجم الصورة كبير جدًا.\n\n" +
            "الحد الأقصى 5 ميجابايت."
        );

        return;
    }


    const sendButton =
        document.getElementById(
            "sendOrderButton"
        );


    const originalText =
        sendButton.innerText;


    try {

        sendButton.disabled = true;

        sendButton.innerText =
            "جاري إرسال الطلب...";


        /* =========================
           اسم مؤقت للصورة
        ========================= */

        const temporaryId =
            crypto.randomUUID();


        const fileExtension =
            paymentFile.name
                .split(".")
                .pop()
                .toLowerCase();


        const filePath =
            `orders/${temporaryId}.${fileExtension}`;


        /* =========================
           رفع صورة الدفع
        ========================= */

        const {
            data: uploadData,
            error: uploadError
        } =
            await supabaseClient.storage
                .from("payment-proofs")
                .upload(
                    filePath,
                    paymentFile,
                    {
                        contentType:
                            paymentFile.type,

                        upsert: false
                    }
                );


        if (uploadError) {

            console.error(
                "UPLOAD ERROR:",
                uploadError
            );

            alert(
                "حصلت مشكلة أثناء رفع صورة الدفع:\n\n" +
                uploadError.message
            );

            return;
        }


        console.log(
            "IMAGE UPLOADED",
            uploadData
        );


        /* =========================
           إنشاء الطلب
        ========================= */

        const {
            data: orderNumber,
            error: orderError
        } =
            await supabaseClient.rpc(
                "create_order",
                {
                    p_product_id:
                        selectedProduct.id,

                    p_product_name:
                        selectedProduct.name,

                    p_product_price:
                        selectedProduct.price,

                    p_customer_name:
                        name,

                    p_customer_phone:
                        phone,

                    p_customer_address:
                        address,

                    p_payment_proof_url:
                        filePath
                }
            );


        if (orderError) {

            console.error(
                "ORDER ERROR:",
                orderError
            );


            await supabaseClient.storage
                .from("payment-proofs")
                .remove([
                    filePath
                ]);


            alert(
                "حصلت مشكلة أثناء حفظ الطلب:\n\n" +
                orderError.message
            );

            return;
        }


        /* =========================
           عرض نجاح الطلب
        ========================= */

        document.getElementById(
            "newOrderNumber"
        ).innerText = orderNumber;


        document.getElementById(
            "orderResult"
        ).style.display = "block";


        /* =========================
           رسالة واتساب
        ========================= */

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

تم حفظ صورة إثبات الدفع داخل النظام.
`;


        const whatsappURL =
            `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                message
            )}`;


        window.open(
            whatsappURL,
            "_blank"
        );


        /* تنظيف النموذج */

        document.getElementById(
            "customerName"
        ).value = "";

        document.getElementById(
            "customerPhone"
        ).value = "";

        document.getElementById(
            "customerAddress"
        ).value = "";

        document.getElementById(
            "paymentProof"
        ).value = "";


        /* عرض التتبع */

        document.getElementById(
            "trackingNumber"
        ).value = orderNumber;


        trackOrder();


    } catch (error) {

        console.error(
            "GENERAL ERROR:",
            error
        );


        alert(
            "حصل خطأ غير متوقع:\n\n" +
            (
                error.message ||
                "خطأ غير معروف"
            )
        );

    } finally {

        sendButton.disabled = false;

        sendButton.innerText =
            originalText;
    }
}


/* =========================
   النزول للتتبع
========================= */

function focusTracking() {

    document.getElementById(
        "trackingSection"
    ).scrollIntoView({
        behavior: "smooth"
    });

    document.getElementById(
        "trackingNumber"
    ).focus();
}


/* =========================
   تتبع الطلب
========================= */

async function trackOrder() {

    const orderNumber =
        document
            .getElementById("trackingNumber")
            .value
            .trim();


    const message =
        document.getElementById(
            "trackingMessage"
        );


    const result =
        document.getElementById(
            "trackingResult"
        );


    if (!orderNumber) {

        message.innerText =
            "اكتب رقم الطلب أولاً.";

        result.style.display =
            "none";

        return;
    }


    message.innerText =
        "جاري البحث...";


    result.style.display =
        "none";


    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            "get_order_tracking",
            {
                p_order_number:
                    orderNumber
            }
        );


    if (error) {

        console.error(
            "TRACKING ERROR:",
            error
        );


        message.innerText =
            "حصل خطأ أثناء البحث عن الطلب.";

        return;
    }


    if (!data || data.length === 0) {

        message.innerText =
            "رقم الطلب غير موجود.";

        return;
    }


    const order =
        data[0];


    message.innerText =
        "";


    result.innerHTML =
        createTrackingHTML(order);


    result.style.display =
        "block";


    startTrackingRefresh(
        order.order_number
    );
}


/* =========================
   إنشاء واجهة الحالة
========================= */

function createTrackingHTML(order) {

    const statusMap = {

        pending: {
            label: "قيد المراجعة",
            index: 0
        },

        confirmed: {
            label: "تم تأكيد الطلب",
            index: 1
        },

        preparing: {
            label: "جاري تجهيز الطلب",
            index: 2
        },

        shipped: {
            label: "تم شحن الطلب",
            index: 3
        },

        delivered: {
            label: "تم تسليم الطلب",
            index: 4
        }

    };


    const current =
        statusMap[order.status] ||
        statusMap.pending;


    const steps = [
        "قيد المراجعة",
        "تم تأكيد الطلب",
        "جاري تجهيز الطلب",
        "تم شحن الطلب",
        "تم تسليم الطلب"
    ];


    let timelineHTML = "";


    steps.forEach(
        (step, index) => {

            const active =
                index <= current.index
                    ? "active"
                    : "";


            timelineHTML += `
                <div class="status-step ${active}">

                    <div class="status-icon">
                        ${
                            index <= current.index
                                ? "✓"
                                : ""
                        }
                    </div>

                    <strong>
                        ${step}
                    </strong>

                </div>
            `;
        }
    );


    const date =
        new Date(
            order.created_at
        ).toLocaleString(
            "ar-EG"
        );


    return `

        <div class="tracking-card">

            <h3>
                الطلب ${order.order_number}
            </h3>


            <div class="tracking-info">

                <div>
                    <strong>المنتج:</strong>
                    ${order.product_name}
                </div>

                <div>
                    <strong>السعر:</strong>
                    ${order.product_price} جنيه
                </div>

                <div>
                    <strong>تاريخ الطلب:</strong>
                    ${date}
                </div>

                <div>
                    <strong>الحالة الحالية:</strong>
                    ${current.label}
                </div>

            </div>


            <div class="status-timeline">

                ${timelineHTML}

            </div>

        </div>
    `;
}


/* =========================
   تحديث تلقائي للحالة
========================= */

function startTrackingRefresh(orderNumber) {

    clearInterval(
        trackingTimer
    );


    trackingTimer =
        setInterval(
            async () => {

                const {
                    data,
                    error
                } =
                    await supabaseClient.rpc(
                        "get_order_tracking",
                        {
                            p_order_number:
                                orderNumber
                        }
                    );


                if (
                    !error &&
                    data &&
                    data.length > 0
                ) {

                    document.getElementById(
                        "trackingResult"
                    ).innerHTML =
                        createTrackingHTML(
                            data[0]
                        );
                }

            },
            15000
        );
}
