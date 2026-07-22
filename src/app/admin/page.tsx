"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

type RequestReply = {
  id: number;
  reply: string | null;
  fileUrl: string | null;
  createdAt: string;
};

type RequestData = {
  id: number;
  companyName: string;
  requestType: string;
  details: string | null;
  applicantName: string;
  phone: string;
  status: string;
  fileUrl?: string | null;
  reply?: string | null;
  replyFileUrl?: string | null;
  replyAt?: string | null;
  createdAt: string;
  replies?: RequestReply[];
};

export default function AdminPage() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<RequestData | null>(null);

  const [reply, setReply] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // البحث
  const [searchText, setSearchText] = useState("");

  // فلترة الحالة
  const [statusFilter, setStatusFilter] = useState("الكل");

  // فلترة التاريخ
  const [dateFilter, setDateFilter] = useState("الكل");

  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  // حالة الحذف
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ==================================================
  // تنسيق التاريخ
  // ==================================================

  function formatDate(date: string | null | undefined) {
    if (!date) {
      return "غير متوفر";
    }

    return new Date(date).toLocaleString("ar-SA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ==================================================
  // جلب الطلبات
  // ==================================================

  async function getRequests() {
    try {
      const response = await fetch("/api/requests", {
        cache: "no-store",
      });

      const data = await response.json();

      if (data.success) {
        setRequests(data.data);

        if (selectedRequest) {
          const updated = data.data.find(
            (item: RequestData) =>
              item.id === selectedRequest.id
          );

          if (updated) {
            setSelectedRequest(updated);
          } else {
            setSelectedRequest(null);
          }
        }
      }
    } catch (error) {
      console.error(error);

      alert("حدث خطأ في جلب الطلبات");
    }
  }

  // ==================================================
  // حذف طلب
  // ==================================================

  async function deleteRequest(id: number) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الطلب PR-${id}؟\n\nسيتم حذف الطلب وجميع الردود المرتبطة به نهائيًا.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(
        "/api/requests",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "حدث خطأ أثناء حذف الطلب"
        );

        return;
      }

      // إزالة الطلب من القائمة مباشرة
      setRequests((prev) =>
        prev.filter(
          (item) => item.id !== id
        )
      );

      // إغلاق التفاصيل إذا كان الطلب المحذوف مفتوحًا
      if (
        selectedRequest?.id === id
      ) {
        setSelectedRequest(null);
      }

      alert("تم حذف الطلب بنجاح");
    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء حذف الطلب"
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ==================================================
  // تحديث حالة الطلب
  // ==================================================

  async function updateStatus(
    id: number,
    status: string
  ) {
    try {
      const response = await fetch("/api/requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "حدث خطأ في تحديث الحالة"
        );

        return;
      }

      setRequests((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
              }
            : item
        )
      );

      if (selectedRequest?.id === id) {
        setSelectedRequest((prev) =>
          prev
            ? {
                ...prev,
                status,
              }
            : null
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء تحديث حالة الطلب"
      );
    }
  }

  // ==================================================
  // إرسال الرد
  // ==================================================

  async function sendReply() {
    if (!selectedRequest) {
      return;
    }

    if (!reply.trim() && !replyFile) {
      alert(
        "يرجى كتابة الرد أو إرفاق ملف واحد على الأقل"
      );

      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append(
        "id",
        String(selectedRequest.id)
      );

      formData.append(
        "reply",
        reply
      );

      if (replyFile) {
        formData.append(
          "replyFile",
          replyFile
        );
      }

      const response = await fetch(
        "/api/requests",
        {
          method: "PATCH",
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "حدث خطأ أثناء إرسال الرد"
        );

        return;
      }

      await getRequests();

      setSelectedRequest(data.data);

      setReply("");
      setReplyFile(null);

      alert(
        "تم إرسال الرد وحفظه تلقائيًا بنجاح"
      );
    } catch (error) {
      console.error(error);

      alert(
        "حدث خطأ أثناء إرسال الرد"
      );
    } finally {
      setLoading(false);
    }
  }

  // ==================================================
  // تحميل الطلبات
  // ==================================================

  useEffect(() => {
    getRequests();
  }, []);

  // ==================================================
  // البحث والفلترة
  // ==================================================

  const filteredRequests =
    requests.filter((item) => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      const matchesSearch =
        !search ||
        `PR-${item.id}`
          .toLowerCase()
          .includes(search) ||
        item.companyName
          .toLowerCase()
          .includes(search) ||
        item.requestType
          .toLowerCase()
          .includes(search) ||
        item.applicantName
          .toLowerCase()
          .includes(search) ||
        item.phone
          .toLowerCase()
          .includes(search) ||
        (item.details || "")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "الكل" ||
        item.status === statusFilter;

      const requestDate =
        new Date(item.createdAt);

      const now = new Date();

      let matchesDate = true;

      if (dateFilter === "آخر 7 أيام") {
        const fromDate = new Date();

        fromDate.setDate(
          now.getDate() - 7
        );

        matchesDate =
          requestDate >= fromDate;
      }

      if (dateFilter === "آخر 30 يوم") {
        const fromDate = new Date();

        fromDate.setDate(
          now.getDate() - 30
        );

        matchesDate =
          requestDate >= fromDate;
      }

      if (dateFilter === "هذا الشهر") {
        matchesDate =
          requestDate.getMonth() ===
            now.getMonth() &&
          requestDate.getFullYear() ===
            now.getFullYear();
      }

      if (dateFilter === "الشهر الماضي") {
        const previousMonth =
          new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
          );

        matchesDate =
          requestDate.getMonth() ===
            previousMonth.getMonth() &&
          requestDate.getFullYear() ===
            previousMonth.getFullYear();
      }

      if (dateFilter === "فترة مخصصة") {
        if (customFromDate) {
          const from =
            new Date(customFromDate);

          from.setHours(
            0,
            0,
            0,
            0
          );

          matchesDate =
            matchesDate &&
            requestDate >= from;
        }

        if (customToDate) {
          const to =
            new Date(customToDate);

          to.setHours(
            23,
            59,
            59,
            999
          );

          matchesDate =
            matchesDate &&
            requestDate <= to;
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate
      );
    });

  // ==================================================
  // تحميل الطلبات إلى Excel
  // ==================================================

  function exportToExcel() {
    if (filteredRequests.length === 0) {
      alert(
        "لا توجد طلبات لتصديرها إلى Excel"
      );

      return;
    }

    const excelData =
      filteredRequests.map(
        (item) => ({
          "رقم الطلب":
            `PR-${item.id}`,

          "الشركة":
            item.companyName,

          "نوع الطلب":
            item.requestType,

          "تفاصيل الطلب":
            item.details ||
            "لا توجد تفاصيل",

          "مقدم الطلب":
            item.applicantName,

          "رقم الجوال":
            item.phone,

          "تاريخ الطلب":
            formatDate(
              item.createdAt
            ),

          "تاريخ آخر رد":
            item.replyAt
              ? formatDate(
                  item.replyAt
                )
              : "لا يوجد رد",

          "الحالة":
            item.status,
        })
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "الطلبات الواردة"
    );

    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 30 },
      { wch: 40 },
      { wch: 25 },
      { wch: 18 },
      { wch: 25 },
      { wch: 25 },
      { wch: 20 },
    ];

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    XLSX.writeFile(
      workbook,
      `الطلبات-الواردة-${today}.xlsx`
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gray-100 p-8"
    >
      <div className="max-w-[1800px] mx-auto">

        {/* Header */}

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border">

          <div className="flex justify-center items-center gap-5">

            <img
              src="/images/nma-logo.jpeg"
              alt="logo"
              className="w-24 h-24 object-contain"
            />

            <div className="text-center">

              <h1 className="text-4xl font-extrabold text-black">
                لوحة تحكم المشتريات
              </h1>

              <p className="text-xl text-black mt-2 font-semibold">
                مؤسسة شاطئ الوصل
              </p>

            </div>

          </div>

        </div>


        {/* الإحصائيات */}

        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-5 mb-8">

          <div className="bg-white rounded-xl shadow-lg border p-5">
            <h3 className="font-bold text-black">
              إجمالي الطلبات
            </h3>

            <p className="text-4xl font-extrabold text-black mt-3">
              {requests.length}
            </p>
          </div>


          <div className="bg-white rounded-xl shadow-lg border p-5">
            <h3 className="font-bold text-black">
              جديدة
            </h3>

            <p className="text-4xl font-extrabold text-black mt-3">
              {
                requests.filter(
                  (r) =>
                    r.status ===
                    "جديد"
                ).length
              }
            </p>
          </div>


          <div className="bg-white rounded-xl shadow-lg border p-5">
            <h3 className="font-bold text-black">
              قيد المراجعة
            </h3>

            <p className="text-4xl font-extrabold text-black mt-3">
              {
                requests.filter(
                  (r) =>
                    r.status ===
                    "قيد المراجعة"
                ).length
              }
            </p>
          </div>


          <div className="bg-white rounded-xl shadow-lg border p-5">
            <h3 className="font-bold text-black">
              تم الرد
            </h3>

            <p className="text-4xl font-extrabold text-black mt-3">
              {
                requests.filter(
                  (r) =>
                    r.status ===
                    "تم الرد"
                ).length
              }
            </p>
          </div>


          <div className="bg-white rounded-xl shadow-lg border p-5">
            <h3 className="font-bold text-black">
              تم التنفيذ
            </h3>

            <p className="text-4xl font-extrabold text-black mt-3">
              {
                requests.filter(
                  (r) =>
                    r.status ===
                    "تم التنفيذ"
                ).length
              }
            </p>
          </div>


          <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 p-5">
            <h3 className="font-bold text-red-700">
              مغلقة
            </h3>

            <p className="text-4xl font-extrabold text-red-700 mt-3">
              {
                requests.filter(
                  (r) =>
                    r.status ===
                    "مغلق"
                ).length
              }
            </p>
          </div>

        </div>


        {/* البحث والفلترة */}

        <div className="bg-white rounded-2xl shadow-lg border p-6 mb-8">

          <h2 className="text-2xl font-bold text-black mb-5">
            البحث عن الطلبات
          </h2>


          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

            <div>

              <label className="block font-bold text-black mb-2">
                بحث
              </label>

              <input
                type="text"
                value={searchText}
                onChange={(e) =>
                  setSearchText(
                    e.target.value
                  )
                }
                placeholder="ابحث برقم الطلب أو الشركة أو نوع الطلب..."
                className="w-full border-2 border-gray-300 rounded-xl p-4 text-black focus:outline-none focus:border-black"
              />

            </div>


            <div>

              <label className="block font-bold text-black mb-2">
                فلترة حسب الحالة
              </label>

              <select
                value={
                  statusFilter
                }
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                className="w-full border-2 border-gray-300 rounded-xl p-4 text-black bg-white"
              >

                <option value="الكل">
                  جميع الطلبات
                </option>

                <option value="جديد">
                  جديدة
                </option>

                <option value="قيد المراجعة">
                  قيد المراجعة
                </option>

                <option value="تم الرد">
                  تم الرد
                </option>

                <option value="تم التنفيذ">
                  تم التنفيذ
                </option>

                <option value="مرفوض">
                  مرفوضة
                </option>

                <option value="مغلق">
                  مغلقة
                </option>

              </select>

            </div>


            <div>

              <label className="block font-bold text-black mb-2">
                البحث حسب الفترة
              </label>

              <select
                value={
                  dateFilter
                }
                onChange={(e) => {

                  setDateFilter(
                    e.target.value
                  );

                  if (
                    e.target.value !==
                    "فترة مخصصة"
                  ) {
                    setCustomFromDate("");
                    setCustomToDate("");
                  }

                }}
                className="w-full border-2 border-gray-300 rounded-xl p-4 text-black bg-white"
              >

                <option value="الكل">
                  جميع الفترات
                </option>

                <option value="آخر 7 أيام">
                  آخر 7 أيام
                </option>

                <option value="آخر 30 يوم">
                  آخر 30 يوم
                </option>

                <option value="هذا الشهر">
                  هذا الشهر
                </option>

                <option value="الشهر الماضي">
                  الشهر الماضي
                </option>

                <option value="فترة مخصصة">
                  تحديد فترة مخصصة
                </option>

              </select>

            </div>

          </div>


          {dateFilter ===
            "فترة مخصصة" && (

            <div className="grid md:grid-cols-2 gap-5 mt-5">

              <div>

                <label className="block font-bold text-black mb-2">
                  من تاريخ
                </label>

                <input
                  type="date"
                  value={
                    customFromDate
                  }
                  onChange={(e) =>
                    setCustomFromDate(
                      e.target.value
                    )
                  }
                  className="w-full border-2 border-gray-300 rounded-xl p-4 text-black"
                />

              </div>


              <div>

                <label className="block font-bold text-black mb-2">
                  إلى تاريخ
                </label>

                <input
                  type="date"
                  value={
                    customToDate
                  }
                  onChange={(e) =>
                    setCustomToDate(
                      e.target.value
                    )
                  }
                  className="w-full border-2 border-gray-300 rounded-xl p-4 text-black"
                />

              </div>

            </div>

          )}


          <div className="mt-5 text-gray-600 font-bold">

            عدد النتائج:
            {" "}
            {filteredRequests.length}

          </div>

        </div>


        {/* جدول الطلبات */}

        <div className="bg-white rounded-2xl shadow-lg border p-6">

          <div className="flex justify-between items-center mb-6">

            <h2 className="text-3xl font-bold text-black">
              الطلبات الواردة
            </h2>


            <div className="flex gap-3">

              <button
                onClick={
                  getRequests
                }
                className="bg-gray-800 text-white px-5 py-3 rounded-xl font-bold"
              >
                تحديث القائمة
              </button>


              <button
                onClick={
                  exportToExcel
                }
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-bold"
              >
                تحميل Excel
              </button>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1650px] border-collapse">

              <thead>

                <tr className="bg-gray-200 text-black">

                  <th className="p-4 text-right whitespace-nowrap border">
                    رقم الطلب
                  </th>

                  <th className="p-4 text-right whitespace-nowrap border">
                    الشركة
                  </th>

                  <th className="p-4 text-right whitespace-nowrap border">
                    نوع الطلب
                  </th>

                  <th className="p-4 text-right whitespace-nowrap border">
                    تفاصيل الطلب
                  </th>

                  <th className="p-4 text-right whitespace-nowrap border">
                    مقدم الطلب
                  </th>

                  <th className="p-4 text-right whitespace-nowrap border">
                    رقم الجوال
                  </th>

                  <th className="p-4 text-right whitespace-nowrap border">
                    تاريخ الطلب
                  </th>

                  <th className="p-4 text-right whitespace-nowrap border">
                    تاريخ آخر رد
                  </th>

                  <th className="p-4 text-right whitespace-nowrap border">
                    الحالة
                  </th>

                  <th className="p-4 text-right whitespace-nowrap border">
                    الإجراءات
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredRequests.length >
                0 ? (

                  filteredRequests.map(
                    (item) => (

                      <tr
                        key={
                          item.id
                        }
                        className="border-b hover:bg-gray-50 text-black"
                      >

                        <td className="p-4 font-bold whitespace-nowrap border">
                          PR-
                          {item.id}
                        </td>


                        <td className="p-4 whitespace-nowrap border font-semibold">
                          {
                            item.companyName
                          }
                        </td>


                        <td className="p-4 border max-w-[220px]">
                          <div className="whitespace-normal leading-7">
                            {
                              item.requestType
                            }
                          </div>
                        </td>


                        <td className="p-4 border max-w-[300px]">
                          <div className="whitespace-normal leading-7">
                            {
                              item.details
                                ? item.details
                                : "لا توجد تفاصيل"
                            }
                          </div>
                        </td>


                        <td className="p-4 whitespace-nowrap border">
                          {
                            item.applicantName
                          }
                        </td>


                        <td className="p-4 whitespace-nowrap border">
                          {
                            item.phone
                          }
                        </td>


                        <td className="p-4 whitespace-nowrap border">
                          {
                            formatDate(
                              item.createdAt
                            )
                          }
                        </td>


                        <td className="p-4 whitespace-nowrap border">
                          {
                            item.replyAt
                              ? formatDate(
                                  item.replyAt
                                )
                              : "لا يوجد رد"
                          }
                        </td>


                        <td className="p-4 border">

                          <select
                            value={
                              item.status
                            }
                            onChange={(
                              e
                            ) =>
                              updateStatus(
                                item.id,
                                e.target
                                  .value
                              )
                            }
                            className="border-2 border-gray-300 rounded-lg px-3 py-2 text-black bg-white font-bold"
                          >

                            <option value="جديد">
                              جديد
                            </option>

                            <option value="قيد المراجعة">
                              قيد المراجعة
                            </option>

                            <option value="تم الرد">
                              تم الرد
                            </option>

                            <option value="تم التنفيذ">
                              تم التنفيذ
                            </option>

                            <option value="مرفوض">
                              مرفوض
                            </option>

                            <option value="مغلق">
                              مغلق
                            </option>

                          </select>

                        </td>


                        <td className="p-4 border">

                          <div className="flex gap-2 items-center">

                            <button
                              onClick={() =>
                                setSelectedRequest(
                                  item
                                )
                              }
                              className="bg-black text-white px-4 py-2 rounded-lg font-bold whitespace-nowrap"
                            >
                              عرض التفاصيل
                            </button>


                            <button
                              onClick={() =>
                                deleteRequest(
                                  item.id
                                )
                              }
                              disabled={
                                deletingId ===
                                item.id
                              }
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold whitespace-nowrap disabled:opacity-50"
                            >
                              {deletingId ===
                              item.id
                                ? "جاري الحذف..."
                                : "حذف"}
                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )

                ) : (

                  <tr>

                    <td
                      colSpan={10}
                      className="p-10 text-center text-gray-500 font-bold text-lg"
                    >
                      لا توجد طلبات مطابقة للبحث أو الفلترة
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>


        {/* تفاصيل الطلب */}

        {selectedRequest && (

          <div className="bg-white rounded-2xl shadow-lg border p-6 mt-8">

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-3xl font-bold text-black">
                تفاصيل الطلب PR-
                {selectedRequest.id}
              </h2>

              <button
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
                className="bg-gray-200 text-black px-5 py-2 rounded-xl font-bold"
              >
                إغلاق التفاصيل
              </button>

            </div>


            <div className="space-y-5 text-xl text-black">

              <p>
                <strong>
                  رقم الطلب:
                </strong>{" "}
                PR-
                {
                  selectedRequest.id
                }
              </p>


              <p>
                <strong>
                  تاريخ إنشاء الطلب:
                </strong>{" "}
                {
                  formatDate(
                    selectedRequest.createdAt
                  )
                }
              </p>


              <p>
                <strong>
                  الشركة:
                </strong>{" "}
                {
                  selectedRequest.companyName
                }
              </p>


              <p>
                <strong>
                  نوع الطلب:
                </strong>{" "}
                {
                  selectedRequest.requestType
                }
              </p>


              <p>
                <strong>
                  مقدم الطلب:
                </strong>{" "}
                {
                  selectedRequest.applicantName
                }
              </p>


              <p>
                <strong>
                  الجوال:
                </strong>{" "}
                {
                  selectedRequest.phone
                }
              </p>


              <p>
                <strong>
                  الحالة:
                </strong>{" "}
                {
                  selectedRequest.status
                }
              </p>


              <p>
                <strong>
                  تاريخ آخر رد:
                </strong>{" "}
                {
                  selectedRequest.replyAt
                    ? formatDate(
                        selectedRequest.replyAt
                      )
                    : "لا يوجد رد حتى الآن"
                }
              </p>


              <div className="border rounded-xl p-4 bg-gray-50">

                <strong>
                  التفاصيل والملاحظات:
                </strong>

                <p className="mt-3 whitespace-pre-wrap">
                  {
                    selectedRequest.details ||
                    "لا توجد تفاصيل"
                  }
                </p>

              </div>


              <div className="border rounded-xl p-4 bg-gray-50">

                <strong>
                  مرفق المورد:
                </strong>

                {selectedRequest.fileUrl ? (

                  <a
                    href={
                      selectedRequest.fileUrl
                    }
                    download
                    className="block mt-3 text-blue-600 font-bold underline"
                  >
                    تحميل مرفق المورد
                  </a>

                ) : (

                  <p className="mt-3 text-gray-500">
                    لا يوجد مرفق
                  </p>

                )}

              </div>


              {/* سجل الردود السابقة */}

              <div className="border rounded-xl p-5 bg-gray-50">

                <h3 className="text-2xl font-bold mb-5">
                  سجل الردود السابقة
                </h3>

                {selectedRequest.replies &&
                selectedRequest.replies.length >
                  0 ? (

                  <div className="space-y-5">

                    {selectedRequest.replies.map(
                      (item, index) => (

                        <div
                          key={
                            item.id
                          }
                          className="bg-white border rounded-xl p-5"
                        >

                          <div className="flex justify-between items-center mb-3">

                            <span className="font-bold text-[#37358A]">
                              الرد رقم{" "}
                              {
                                selectedRequest
                                  .replies
                                  ?.length
                                  ? selectedRequest
                                      .replies
                                      .length -
                                    index
                                  : index + 1
                              }
                            </span>

                            <span className="text-sm text-gray-500">
                              {
                                formatDate(
                                  item.createdAt
                                )
                              }
                            </span>

                          </div>


                          <p className="text-black whitespace-pre-wrap leading-8">
                            {
                              item.reply ||
                              "رد مرفق فقط بدون نص"
                            }
                          </p>


                          {item.fileUrl && (

                            <a
                              href={
                                item.fileUrl
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-4 text-blue-600 font-bold underline"
                            >
                              فتح ملف الرد
                            </a>

                          )}

                        </div>

                      )
                    )}

                  </div>

                ) : (

                  <p className="text-gray-500 font-bold">
                    لا توجد ردود سابقة حتى الآن
                  </p>

                )}

              </div>


              {/* إرسال رد جديد */}

              <div className="border-t pt-6 mt-6">

                <h3 className="text-2xl font-bold mb-5">
                  إرسال رد للمورد
                </h3>


                <textarea
                  value={
                    reply
                  }
                  onChange={(e) =>
                    setReply(
                      e.target.value
                    )
                  }
                  placeholder="اكتب الرد هنا..."
                  className="w-full border rounded-xl p-4 h-36 text-black"
                />


                <div className="border-2 border-dashed border-gray-300 rounded-xl p-5 mt-5">

                  <label className="block font-bold mb-3">
                    إرفاق ملف مع الرد
                  </label>


                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setReplyFile(
                        e.target
                          .files?.[0] ||
                          null
                      )
                    }
                    className="w-full border rounded-xl p-4 text-black"
                  />


                  <p className="text-sm text-gray-500 mt-2">
                    المسموح:
                    {" "}
                    PDF - Excel - JPG - JPEG - PNG
                  </p>


                  {replyFile && (

                    <p className="text-green-700 font-bold mt-3">

                      الملف المختار:
                      {" "}
                      {
                        replyFile.name
                      }

                    </p>

                  )}

                </div>


                <button
                  onClick={
                    sendReply
                  }
                  disabled={
                    loading
                  }
                  className="bg-black text-white px-8 py-4 rounded-xl font-bold mt-5 disabled:opacity-50"
                >

                  {loading
                    ? "جاري الحفظ..."
                    : "إرسال الرد وحفظه تلقائيًا"}

                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </main>
  );
}