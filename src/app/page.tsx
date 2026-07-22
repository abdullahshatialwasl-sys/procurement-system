"use client";

import { useState } from "react";

type SearchResult = {
id: number;
companyName: string;
requestType: string;
details: string | null;
status: string;
reply: string | null;
replyFileUrl: string | null;
};

export default function Home() {
const [companyName, setCompanyName] = useState("");
const [requestType, setRequestType] = useState<string[]>([]);
const [details, setDetails] = useState("");
const [applicantName, setApplicantName] = useState("");
const [phone, setPhone] = useState("");

// ملف المورد
const [requestFile, setRequestFile] = useState<File | null>(null);

// رسالة نجاح الإرسال
const [message, setMessage] = useState("");

// رقم الطلب بعد الإرسال
const [submittedRequestNumber, setSubmittedRequestNumber] =
useState<string | null>(null);

const [searchNumber, setSearchNumber] = useState("");

const [searchResult, setSearchResult] =
useState<SearchResult | null>(null);

const requestOptions = [
"تقرير مخزون",
"مطابقة كشف حساب",
"متابعة المستحقات المالية",
"إضافة منتجات جديدة",
"طلب عرض ترويجي",
"متابعة مرتجع",
"طلب فتح حساب مورد",
"تحديث بيانات المورد",
"طلب اجتماع مع المشتريات",
"أخرى",
];

function toggleRequest(item: string) {
if (requestType.includes(item)) {
setRequestType(
requestType.filter((x) => x !== item)
);
} else {
setRequestType([
...requestType,
item,
]);
}
}

async function sendRequest() {
if (!companyName.trim()) {
alert("يرجى كتابة اسم الشركة");
return;
}

```
if (requestType.length === 0) {
  alert("يرجى اختيار خدمة واحدة على الأقل");
  return;
}

if (!applicantName.trim()) {
  alert("يرجى كتابة اسم مقدم الطلب");
  return;
}

if (!phone.trim()) {
  alert("يرجى كتابة رقم الجوال");
  return;
}

try {
  const formData = new FormData();

  formData.append(
    "companyName",
    companyName
  );

  formData.append(
    "requestType",
    requestType.join(" - ")
  );

  formData.append(
    "details",
    details
  );

  formData.append(
    "applicantName",
    applicantName
  );

  formData.append(
    "phone",
    phone
  );

  // إضافة ملف المورد
  if (requestFile) {
    formData.append(
      "file",
      requestFile
    );
  }

  const response = await fetch(
    "/api/requests",
    {
      method: "POST",
      body: formData,
    }
  );

  const data =
    await response.json();

  if (data.success) {
    const requestNumber =
      `PR-${data.data.id}`;

    // إبقاء رقم الطلب ظاهرًا
    setSubmittedRequestNumber(
      requestNumber
    );

    setMessage(
      "تم إرسال الطلب بنجاح"
    );

    // تنظيف الحقول
    setCompanyName("");
    setRequestType([]);
    setDetails("");
    setApplicantName("");
    setPhone("");
    setRequestFile(null);

  } else {
    setMessage(
      data.message ||
        "حدث خطأ أثناء الإرسال"
    );
  }

} catch (error) {
  console.error(error);

  setMessage(
    "حدث خطأ أثناء الاتصال بالخادم"
  );
}
```

}

async function searchRequest() {
if (!searchNumber.trim()) {
alert(
"يرجى كتابة رقم الطلب مثل PR-1"
);
return;
}

```
try {
  const response =
    await fetch(
      `/api/requests?number=${searchNumber}`
    );

  const data =
    await response.json();

  if (data.success) {
    setSearchResult(
      data.data
    );
  } else {
    setSearchResult(null);

    alert(
      "لم يتم العثور على الطلب"
    );
  }

} catch (error) {
  console.error(error);

  alert(
    "حدث خطأ أثناء البحث"
  );
}
```

}

const inputStyle = `     w-full
    border-2
    border-[#37358A]/40
    rounded-xl
    p-4
    text-black
    font-semibold
    focus:outline-none
    focus:border-[#37358A]
  `;

return ( <main
   dir="rtl"
   className="
     min-h-screen
     bg-gradient-to-br
     from-blue-50
     via-white
     to-yellow-50
     flex
     justify-center
     p-6
   "
 >

```
  <div
    className="
      bg-white
      w-full
      max-w-6xl
      rounded-3xl
      shadow-2xl
      p-10
      border-2
      border-[#37358A]/20
      relative
    "
  >

    {/* الهيدر */}

    <div
      className="
        flex
        flex-col
        items-center
        mb-10
      "
    >

      <img
        src="/images/nma-logo.jpeg"
        alt="logo"
        className="
          w-40
          h-40
          object-contain
        "
      />

      <h1
        className="
          text-5xl
          font-extrabold
          text-[#26245f]
          mt-4
        "
      >
        مؤسسة شاطئ الوصل
      </h1>

      <p
        className="
          text-2xl
          font-bold
          text-[#C91D2D]
          mt-3
        "
      >
        بوابة الموردين - قسم المشتريات
      </p>

    </div>

    {/* نموذج الطلب */}

    <div
      className="
        grid
        grid-cols-1
        md:grid-cols-2
        gap-6
      "
    >

      {/* اسم الشركة */}

      <div className="md:col-span-2">

        <label
          className="
            block
            mb-3
            font-bold
            text-[#37358A]
          "
        >
          اسم الشركة
        </label>

        <input
          value={companyName}
          onChange={(e) =>
            setCompanyName(
              e.target.value
            )
          }
          placeholder="اكتب اسم الشركة"
          className={inputStyle}
        />

      </div>

      {/* الخدمات */}

      <div className="md:col-span-2">

        <label
          className="
            block
            mb-4
            font-bold
            text-xl
            text-[#37358A]
          "
        >
          الخدمات المطلوبة
        </label>

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-4
          "
        >

          {requestOptions.map(
            (item) => (
              <label
                key={item}
                className="
                  border-2
                  rounded-xl
                  p-4
                  cursor-pointer
                  hover:bg-blue-50
                  text-black
                  font-bold
                "
              >

                <input
                  type="checkbox"
                  checked={requestType.includes(
                    item
                  )}
                  onChange={() =>
                    toggleRequest(
                      item
                    )
                  }
                />

                <span className="mr-3">
                  {item}
                </span>

              </label>
            )
          )}

        </div>

      </div>

      {/* التفاصيل */}

      <div className="md:col-span-2">

        <label
          className="
            block
            mb-3
            font-bold
            text-[#37358A]
          "
        >
          التفاصيل والملاحظات
        </label>

        <textarea
          value={details}
          onChange={(e) =>
            setDetails(
              e.target.value
            )
          }
          placeholder="اكتب تفاصيل الطلب هنا"
          className="
            w-full
            h-40
            border-2
            border-[#37358A]/40
            rounded-xl
            p-4
            text-black
            font-semibold
          "
        />

      </div>

      {/* اسم مقدم الطلب */}

      <div>

        <input
          value={applicantName}
          onChange={(e) =>
            setApplicantName(
              e.target.value
            )
          }
          placeholder="اسم مقدم الطلب"
          className={inputStyle}
        />

      </div>

      {/* رقم الجوال */}

      <div>

        <input
          value={phone}
          onChange={(e) =>
            setPhone(
              e.target.value
            )
          }
          placeholder="رقم الجوال"
          className={inputStyle}
        />

      </div>

      {/* مرفق المورد */}

      <div className="md:col-span-2">

        <label
          className="
            block
            mb-3
            font-bold
            text-[#37358A]
          "
        >
          إرفاق ملف مع الطلب
        </label>

        <input
          type="file"
          accept="
            .pdf,
            .xlsx,
            .xls,
            .jpg,
            .jpeg,
            .png
          "
          onChange={(e) => {

            const file =
              e.target.files?.[0] ||
              null;

            setRequestFile(file);

          }}
          className="
            w-full
            border-2
            border-[#37358A]/40
            rounded-xl
            p-3
            text-black
            font-semibold
            bg-white
            file:bg-[#37358A]
            file:text-white
            file:border-0
            file:px-5
            file:py-2
            file:rounded-lg
            file:cursor-pointer
          "
        />

        <p
          className="
            mt-2
            text-sm
            text-gray-600
          "
        >
          الملفات المسموحة: PDF - Excel - JPG - JPEG - PNG
        </p>

        {requestFile && (
          <div
            className="
              mt-3
              bg-blue-50
              border
              border-[#37358A]/20
              rounded-xl
              p-4
              text-[#37358A]
              font-bold
            "
          >
            الملف المختار:
            {" "}
            {requestFile.name}
          </div>
        )}

      </div>

      {/* زر الإرسال */}

      <div className="md:col-span-2">

        <button
          onClick={sendRequest}
          className="
            w-full
            bg-[#37358A]
            text-white
            rounded-xl
            p-5
            text-xl
            font-extrabold
            shadow-xl
            hover:bg-[#2d2b70]
            transition
          "
        >
          إرسال الطلب
        </button>

      </div>

      {/* رسالة الإرسال */}

      {message && (
        <div className="md:col-span-2">

          <p
            className="
              text-center
              text-xl
              font-bold
              text-[#26245f]
            "
          >
            {message}
          </p>

        </div>
      )}

      {/* رقم الطلب ورسالة التأكيد */}

      {submittedRequestNumber && (
        <div
          className="
            md:col-span-2
            bg-green-50
            border-2
            border-green-500
            rounded-2xl
            p-6
            text-center
          "
        >

          <p
            className="
              text-lg
              font-bold
              text-green-800
            "
          >
            تم استلام طلبك بنجاح ✅
          </p>

          <p
            className="
              text-3xl
              font-extrabold
              text-[#37358A]
              mt-3
              select-all
            "
          >
            رقم الطلب:
            {" "}
            {submittedRequestNumber}
          </p>

          <p
            className="
              text-lg
              font-bold
              text-gray-800
              mt-5
              leading-8
            "
          >
            سيتم مراجعة طلبك والرد عليك خلال مدة تتراوح من 6 إلى 24 ساعة.
          </p>

          <p
            className="
              text-sm
              text-gray-700
              mt-3
            "
          >
            يرجى الاحتفاظ برقم الطلب لمتابعة حالة الطلب والاطلاع على رد قسم المشتريات.
          </p>

        </div>
      )}

      {/* متابعة الطلب */}

      <div
        className="
          md:col-span-2
          mt-10
          border-2
          border-[#37358A]/20
          rounded-2xl
          p-6
        "
      >

        <h2
          className="
            text-3xl
            font-bold
            text-[#37358A]
            mb-5
          "
        >
          متابعة الطلب
        </h2>

        <input
          value={searchNumber}
          onChange={(e) =>
            setSearchNumber(
              e.target.value
            )
          }
          placeholder="مثال PR-1"
          className={inputStyle}
        />

        <button
          onClick={searchRequest}
          className="
            mt-4
            w-full
            bg-[#37358A]
            text-white
            rounded-xl
            p-4
            font-bold
            text-lg
          "
        >
          بحث عن الطلب
        </button>

        {searchResult && (
          <div
            className="
              mt-6
              bg-blue-50
              rounded-xl
              p-6
              border
              text-black
            "
          >

            <p
              className="
                font-bold
                text-lg
              "
            >
              رقم الطلب:
              {" "}
              PR-{searchResult.id}
            </p>

            <p
              className="
                mt-3
                font-bold
              "
            >
              حالة الطلب:
              {" "}
              {searchResult.status}
            </p>

            {/* رد قسم المشتريات */}

            <div
              className="
                mt-5
                bg-white
                rounded-xl
                p-5
                border
              "
            >

              <h3
                className="
                  font-bold
                  text-[#37358A]
                  text-lg
                "
              >
                رد قسم المشتريات
              </h3>

              <p className="mt-3">
                {searchResult.reply ||
                  "لا يوجد رد حالياً"}
              </p>

            </div>

            {/* مرفق قسم المشتريات */}

            {searchResult.replyFileUrl && (
              <div
                className="
                  mt-5
                  bg-white
                  rounded-xl
                  p-5
                  border
                "
              >

                <h3
                  className="
                    font-bold
                    text-[#37358A]
                  "
                >
                  مرفق قسم المشتريات
                </h3>

                <a
                  href={
                    searchResult.replyFileUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    block
                    mt-3
                    text-blue-600
                    font-bold
                    underline
                  "
                >
                  فتح الملف المرفق
                </a>

              </div>
            )}

          </div>
        )}

      </div>

    </div>

  </div>

</main>
```

);
}
