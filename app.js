const WHATSAPP_NUMBER = "201070845123";

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


function sendOrder() {

    const name =
        document.getElementById("customerName").value.trim();

    const phone =
        document.getElementById("customerPhone").value.trim();

    const address =
        document.getElementById("customerAddress").value.trim();

    const paymentProof =
        document.getElementById("paymentProof").files[0];


    if (!selectedProduct) {
        alert("من فضلك اختار منتج أولاً.");
        return;
    }


    if (!name || !phone || !address) {
        alert("من فضلك اكتب الاسم ورقم الموبايل والعنوان.");
        return;
    }


    if (!paymentProof) {
        alert("من فضلك ارفع Screenshot لإثبات الدفع.");
        return;
    }


    const orderNumber =
        "ORD-" + Date.now().toString().slice(-6);


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

إثبات الدفع:
تم رفع Screenshot لإثبات الدفع.

يرجى مراجعة الطلب.
`;


    const whatsappURL =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;


    window.open(whatsappURL, "_blank");
}
