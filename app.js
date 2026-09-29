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
        document.querySelector(
            "#orderSection button"
        );


    const originalButtonText =
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
                "حصلت مشكلة أثناء رفع صورة الدفع.\n\n" +
                uploadError.message
            );

            return;
        }


        console.log(
            "IMAGE UPLOADED:",
            uploadData
        );


        /* =========================
           إنشاء الطلب عن طريق RPC
        ========================= */

        const {
            data: createdOrderNumber,
            error: orderError
        } =
            await supabaseClient
                .rpc(
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


            /* حذف الصورة لو إنشاء الطلب فشل */

            await supabaseClient.storage
                .from("payment-proofs")
                .remove([
                    filePath
                ]);


            alert(
                "حصلت مشكلة أثناء حفظ الطلب.\n\n" +
                orderError.message
            );

            return;
        }


        const orderNumber =
            createdOrderNumber;


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

تم حفظ صورة إثبات الدفع داخل النظام.
`;


        const whatsappURL =
            `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                message
            )}`;


        /* =========================
           نجاح
        ========================= */

        alert(
            "تم تسجيل الطلب بنجاح ✅\n\n" +
            "رقم الطلب:\n" +
            orderNumber
        );


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
            originalButtonText;
    }
}
