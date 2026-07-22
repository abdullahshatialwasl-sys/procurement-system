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
  attachments?: {
    id: number;
    fileUrl: string;
    fileName: string;
  }[];
};

export default function Home() {
  const [companyName, setCompanyName] = useState("");
  const [requestType, setRequestType] = useState<string[]>([]);
  const [details, setDetails] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");

  const [requestFiles, setRequestFiles] = useState<File[]>([]);

  const [message, setMessage] = useState("");

  const [submittedRequestNumber, setSubmittedRequestNumber] =
    useState<string | null>(null);

  const [searchNumber, setSearchNumber] = useState("");

  const [searchResult, setSearchResult] =
    useState<SearchResult | null>(null);

  const [sending, setSending] = useState(false);

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
        requestType.filter(
          (x) => x !== item
        )
      );
    } else {
      setRequestType([
        ...requestType,
        item,
      ]);
    }
  }

  function handleFilesChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles =
      Array.from(
        e.target.files || []
      );

    if (selectedFiles.length === 0) {
      return;
    }

    setRequestFiles(
      (previousFiles) => [
        ...previousFiles,
        ...selectedFiles,
      ]
    );

    e.target.value = "";
  }

  function removeFile(index: number) {
    setRequestFiles(
      (previousFiles) =>
        previousFiles.filter(
          (_, fileIndex) =>
            fileIndex !== index
        )
    );
  }

  async function sendRequest() {
    if (!companyName.trim()) {
      alert(
        "يرجى كتابة اسم الشركة"
      );
      return;
    }

    if (
      requestType.length === 0
    ) {
      alert(
        "يرجى اختيار خدمة واحدة على الأقل"
      );
      return;
    }

    if (!applicantName.trim()) {
      alert(
        "يرجى كتابة اسم مقدم الطلب"
      );
      return;
    }

    if (!phone.trim()) {
      alert(
        "يرجى كتابة رقم الجوال"
      );
      return;
    }

    setSending(true);
    setMessage("");

    try {
      const formData =
        new FormData();

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

      requestFiles.forEach(
        (file) => {
          formData.append(
            "files",
            file
          );
        }
      );

      const response =
        await fetch(
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

        setSubmittedRequestNumber(
          requestNumber
        );

        setMessage(
          "تم إرسال الطلب بنجاح"
        );

        setCompanyName("");
        setRequestType([]);
        setDetails("");
        setApplicantName("");
        setPhone("");
        setRequestFiles([]);

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

    } finally {
      setSending(false);
    }
  }

  async function searchRequest() {
    if (!searchNumber.trim()) {
      alert(
        "يرجى كتابة رقم الطلب مثل PR-1"
      );
      return;
    }

    try {
      const response =
        await fetch(
          `/api/requests?number=${encodeURIComponent(
            searchNumber
          )}`
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
  }

  const inputStyle =
    "w-full border-2 border-[#37358A]/40 rounded-xl p-3 sm:p-4 text-sm sm:text-base text-black font-semibold focus:outline-none focus:border-[#37358A]";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 flex justify-center p-3 sm:p-5 md:p-6 lg:p-8"
    >

      <div className="bg-white w-full max-w-6xl rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 lg:p-10 border-2 border-[#37358A]/20 relative">

        {/* ================================
            الهيدر
        ================================= */}

        <div className="flex flex-col items-center mb-7 sm:mb-10">

          <img
            src="/images/nma-logo.jpeg"
            alt="logo"
            className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 object-contain"
          />

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#26245f] mt-3 sm:mt-4 text-center">
            مؤسسة شاطئ الوصل
          </h1>

          <p className="text-base sm:text-xl md:text-2xl font-bold text-[#C91D2D] mt-2 sm:mt-3 text-center">
            بوابة الموردين - قسم المشتريات
          </p>

        </div>


        {/* ================================
            نموذج الطلب
        ================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">

          {/* اسم الشركة */}

          <div className="md:col-span-2">

            <label className="block mb-2 sm:mb-3 font-bold text-sm sm:text-base text-[#37358A]">
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

            <label className="block mb-3 sm:mb-4 font-bold text-base sm:text-lg md:text-xl text-[#37358A]">
              الخدمات المطلوبة
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">

              {requestOptions.map(
                (item) => (

                  <label
                    key={item}
                    className={`border-2 rounded-xl p-3 sm:p-4 cursor-pointer hover:bg-blue-50 text-black font-bold text-sm sm:text-base transition ${
                      requestType.includes(
                        item
                      )
                        ? "border-[#37358A] bg-blue-50"
                        : "border-gray-200"
                    }`}
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
                      className="accent-[#37358A]"
                    />

                    <span className="mr-2 sm:mr-3">
                      {item}
                    </span>

                  </label>

                )
              )}

            </div>

          </div>


          {/* التفاصيل */}

          <div className="md:col-span-2">

            <label className="block mb-2 sm:mb-3 font-bold text-sm sm:text-base text-[#37358A]">
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
              className="w-full h-32 sm:h-36 md:h-40 border-2 border-[#37358A]/40 rounded-xl p-3 sm:p-4 text-sm sm:text-base text-black font-semibold focus:outline-none focus:border-[#37358A] resize-y"
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
              type="tel"
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


          {/* ================================
              مرفقات المورد
          ================================= */}

          <div className="md:col-span-2">

            <label className="block mb-2 sm:mb-3 font-bold text-sm sm:text-base text-[#37358A]">
              إرفاق ملفات مع الطلب
            </label>

            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
              onChange={
                handleFilesChange
              }
              className="w-full border-2 border-[#37358A]/40 rounded-xl p-2 sm:p-3 text-xs sm:text-sm md:text-base text-black font-semibold bg-white file:bg-[#37358A] file:text-white file:border-0 file:px-3 sm:file:px-5 file:py-2 file:rounded-lg file:cursor-pointer"
            />

            <p className="mt-2 text-xs sm:text-sm text-gray-600">
              يمكنك اختيار أكثر من ملف.
              الملفات المسموحة:
              PDF - Excel - JPG - JPEG - PNG
            </p>


            {/* قائمة الملفات */}

            {requestFiles.length > 0 && (

              <div className="mt-4 sm:mt-5 border-2 border-blue-100 rounded-2xl p-3 sm:p-5 bg-blue-50">

                <h3 className="font-bold text-[#37358A] text-base sm:text-lg mb-3 sm:mb-4">
                  الملفات المختارة (
                  {requestFiles.length}
                  )
                </h3>

                <div className="space-y-2 sm:space-y-3">

                  {requestFiles.map(
                    (
                      file,
                      index
                    ) => (

                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-2 sm:gap-4 bg-white border rounded-xl p-3 sm:p-4"
                      >

                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">

                          <span className="text-lg sm:text-xl shrink-0">
                            📎
                          </span>

                          <span className="font-semibold text-black text-xs sm:text-sm md:text-base truncate">
                            {file.name}
                          </span>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeFile(
                              index
                            )
                          }
                          className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap shrink-0"
                        >
                          حذف
                        </button>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}

          </div>


          {/* زر الإرسال */}

          <div className="md:col-span-2">

            <button
              onClick={
                sendRequest
              }
              disabled={sending}
              className="w-full bg-[#37358A] text-white rounded-xl p-4 sm:p-5 text-base sm:text-lg md:text-xl font-extrabold shadow-xl hover:bg-[#2d2b70] transition disabled:opacity-50"
            >
              {sending
                ? "جاري إرسال الطلب..."
                : "إرسال الطلب"}
            </button>

          </div>


          {/* رسالة الإرسال */}

          {message && (

            <div className="md:col-span-2">

              <p className="text-center text-base sm:text-lg md:text-xl font-bold text-[#26245f]">
                {message}
              </p>

            </div>

          )}


          {/* ================================
              رقم الطلب ورسالة التأكيد
          ================================= */}

          {submittedRequestNumber && (

            <div className="md:col-span-2 bg-green-50 border-2 border-green-500 rounded-2xl p-4 sm:p-6 text-center">

              <p className="text-base sm:text-lg font-bold text-green-800">
                تم استلام طلبك بنجاح ✅
              </p>

              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#37358A] mt-3 break-words">
                رقم الطلب:
                {" "}
                {submittedRequestNumber}
              </p>

              <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mt-4 sm:mt-5 leading-7 sm:leading-8">
                سيتم مراجعة طلبك والرد عليك خلال مدة تتراوح من 6 إلى 24 ساعة.
              </p>

              <p className="text-xs sm:text-sm text-gray-700 mt-3 leading-6">
                يرجى الاحتفاظ برقم الطلب لمتابعة حالة الطلب والاطلاع على رد قسم المشتريات.
              </p>

            </div>

          )}


          {/* ================================
              متابعة الطلب
          ================================= */}

          <div className="md:col-span-2 mt-6 sm:mt-8 md:mt-10 border-2 border-[#37358A]/20 rounded-2xl p-4 sm:p-5 md:p-6">

            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#37358A] mb-4 sm:mb-5">
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
              onClick={
                searchRequest
              }
              className="mt-3 sm:mt-4 w-full bg-[#37358A] text-white rounded-xl p-3 sm:p-4 font-bold text-base sm:text-lg"
            >
              بحث عن الطلب
            </button>


            {/* نتيجة البحث */}

            {searchResult && (

              <div className="mt-5 sm:mt-6 bg-blue-50 rounded-xl p-4 sm:p-6 border text-black overflow-hidden">

                <p className="font-bold text-base sm:text-lg break-words">
                  رقم الطلب:
                  {" "}
                  PR-
                  {searchResult.id}
                </p>

                <p className="mt-3 font-bold text-sm sm:text-base">
                  حالة الطلب:
                  {" "}
                  {searchResult.status}
                </p>


                {/* رد قسم المشتريات */}

                <div className="mt-4 sm:mt-5 bg-white rounded-xl p-4 sm:p-5 border">

                  <h3 className="font-bold text-[#37358A] text-base sm:text-lg">
                    رد قسم المشتريات
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap text-sm sm:text-base leading-7 break-words">
                    {searchResult.reply ||
                      "لا يوجد رد حالياً"}
                  </p>

                </div>


                {/* مرفق قسم المشتريات */}

                {searchResult.replyFileUrl && (

                  <div className="mt-4 sm:mt-5 bg-white rounded-xl p-4 sm:p-5 border">

                    <h3 className="font-bold text-[#37358A] text-sm sm:text-base">
                      مرفق قسم المشتريات
                    </h3>

                    <a
                      href={
                        searchResult.replyFileUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-3 text-blue-600 font-bold underline text-sm sm:text-base break-all"
                    >
                      فتح الملف المرفق
                    </a>

                  </div>

                )}


                {/* مرفقات الطلب */}

                {searchResult.attachments &&
                  searchResult.attachments.length >
                    0 && (

                    <div className="mt-4 sm:mt-5 bg-white rounded-xl p-4 sm:p-5 border">

                      <h3 className="font-bold text-[#37358A] text-sm sm:text-base">
                        المرفقات المرسلة
                      </h3>

                      <div className="mt-3 space-y-2">

                        {searchResult.attachments.map(
                          (file) => (

                            <a
                              key={
                                file.id
                              }
                              href={
                                file.fileUrl
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-blue-600 font-bold underline text-sm sm:text-base break-all"
                            >
                              📎{" "}
                              {
                                file.fileName
                              }
                            </a>

                          )
                        )}

                      </div>

                    </div>

                  )}

              </div>

            )}

          </div>

        </div>

      </div>

    </main>
  );
}