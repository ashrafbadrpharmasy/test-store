const SUPABASE_URL = "https://uklivylyenatdqbgmcxy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_ntlKWYQvMXlCs_obIEVIIA_-CfxOFTJ";

const WHATSAPP_NUMBER = "201070845123";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

let selectedProduct = null;


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


    if (!name || !phone || !address) {
        alert("من فضلك اكتب الاسم ورقم الموبايل والعنوان.");
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
        alert("مسموح فقط JPG أو PNG أو WEBP.");
        return;
    }


    if (paymentFile.size > 5 * 1024 * 1024) {
        alert("حجم الصورة يجب ألا يتعدى 5 ميجابايت.");
        return;
    }


    const orderNumber =
        "ORD-" +
        Date.now().toString().slice(-8);


    const fileExtension =
        paymentFile.name.split(".").pop().toLowerCase();


    const filePath =
        `orders/${orderNumber}.${fileExtension}`;


    try {

        alert("جاري إرسال الطلب...");


        // رفع صورة إثبات الدفع
        const { error: uploadError } =
            await supabaseClient.storage
                .from("payment-proofs")
                .upload(filePath, paymentFile, {
                    contentType: paymentFile.type,
                    upsert: false
                });


        if (uploadError) {
            console.error(uploadError);
            alert("حصلت مشكلة أثناء رفع صورة الدفع.");
            return;
        }


        // حفظ الطلب في قاعدة البيانات
        const { error: insertError } =
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
                });


        if (insertError) {
            console.error(insertError);

            // حذف الصورة لو حفظ الطلب فشل
            await supabaseClient.storage
                .from("payment-proofs")
                .remove([filePath]);

            alert("حصلت مشكلة أثناء حفظ الطلب.");
            return;
        }


        // تجهيز رسالة واتساب للموظف
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


        alert(
            `تم تسجيل طلبك بنجاح!\n\nرقم الطلب: ${orderNumber}`
        );


        window.open(whatsappURL, "_blank");


        // تنظيف النموذج
        document.getElementById("customerName").value = "";
        document.getElementById("customerPhone").value = "";
        document.getElementById("customerAddress").value = "";
        document.getElementById("paymentProof").value = "";


    } catch (error) {

        console.error(error);

        alert("حصل خطأ غير متوقع أثناء إرسال الطلب.");
    }
}
