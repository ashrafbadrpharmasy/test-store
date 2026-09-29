const SUPABASE_URL = "https://uklivylyenatdqbgmcxy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_ntlKWYQvMXlCs_obIEVIIA_-CfxOFTJ";

const WHATSAPP_NUMBER = "201070845123";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

let selectedProduct = null;


/* =========================
   اختيار المنتج
========================= */

function openOrder(productId, productName, productPrice) {

    selectedProduct = {
        id: productId,
        name: productName,
        price: productPrice
    };

    document.getElementById("selectedProduct").innerText =
        `المنتج المختار: ${productName} - ${productPrice} جنيه`;

    document.getElementById("orderSection").style.display = "block";

    document.getElementById("orderSection").scrollIntoView({
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
        document.getElementById("customerName").value.trim();

    const phone =
        document.getElementById("customerPhone").value.trim();

    const address =
        document.getElementById("customerAddress").value.trim();

    const paymentFile =
        document.getElementById("paymentProof").files[0];


    /* التحقق من البيانات */

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


    /* أنواع الصور المسموحة */

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


    /* الحد الأقصى 5MB */

    if (paymentFile.size > 5 * 1024 * 1024) {

        alert(
            "حجم الصورة كبير جدًا.\n\n" +
            "الحد الأقصى 5 ميجابايت."
        );

        return;
    }


    try {

        alert("جاري إرسال الطلب...");


        /* =========================
           رقم الطلب
        ========================= */

        const orderNumber =
            "ORD-" +
            Date.now().toString().slice(-8);


        /* =========================
           اسم ملف الصورة
        ========================= */

        const fileExtension =
            paymentFile.name
                .split(".")
                .pop()
                .toLowerCase();


        const filePath =
            `orders/${orderNumber}.${fileExtension}`;


        /* =========================
           رفع صورة الدفع
        ========================= */

        const { data: uploadData, error: uploadError } =
            await supabaseClient.storage
                .from("payment-proofs")
                .upload(
                    filePath,
                    paymentFile,
                    {
                        contentType: paymentFile.type,
                        upsert: false
                    }
                );


        if (uploadError) {

            console.error(
                "UPLOAD ERROR:",
                uploadError
            );

            alert(
                "حصلت مشكلة أثناء رفع صورة الدفع.\n\n" +
                "الخطأ:\n" +
                (uploadError.message || "خطأ غير معروف")
            );

            return;
        }


        console.log(
            "UPLOAD SUCCESS:",
            uploadData
        );


        /* =========================
           حفظ الطلب في قاعدة البيانات
        ========================= */

        const { data: orderData, error: insertError } =
            await supabaseClient
                .from("orders")
                .insert({

                    order_number: orderNumber,

                    product_id: selectedProduct.id,

                    product_name: selectedProduct.name,

                    product_price: selectedProduct.price,

                    customer_name: name,

                    customer_phone: phone,

                    customer_address: address,

                    payment_proof_url: filePath,

                    status: "pending"

                })
                .select();


        if (insertError) {

            console.error(
                "DATABASE ERROR:",
                insertError
            );


            /* حذف الصورة لو حفظ الطلب فشل */

            await supabaseClient.storage
                .from("payment-proofs")
                .remove([
                    filePath
                ]);


            alert(
                "الصورة اترفعت، لكن حصلت مشكلة أثناء حفظ الطلب.\n\n" +
                "الخطأ:\n" +
                (insertError.message || "خطأ غير معروف")
            );

            return;
        }


        console.log(
            "ORDER SAVED:",
            orderData
        );


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

حالة الطلب:
قيد المراجعة

تم حفظ صورة إثبات الدفع في النظام.
`;


        const whatsappURL =
            `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;


        /* =========================
           رسالة نجاح
        ========================= */

        alert(
            `تم تسجيل الطلب بنجاح ✅\n\n` +
            `رقم الطلب: ${orderNumber}`
        );


        /* فتح واتساب */

        window.open(
            whatsappURL,
            "_blank"
        );


        /* =========================
           تنظيف النموذج
        ========================= */

        document.getElementById("customerName").value = "";

        document.getElementById("customerPhone").value = "";

        document.getElementById("customerAddress").value = "";

        document.getElementById("paymentProof").value = "";


    } catch (error) {

        console.error(
            "GENERAL ERROR:",
            error
        );


        alert(
            "حصل خطأ غير متوقع.\n\n" +
            (error.message || "خطأ غير معروف")
        );
    }
}
