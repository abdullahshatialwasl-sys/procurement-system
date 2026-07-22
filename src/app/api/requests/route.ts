import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

// ==================================================
// إعدادات الملفات
// ==================================================

const BUCKET_NAME = "uploads";

const allowedTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/jpeg",
  "image/png",
];

// ==================================================
// إنشاء اسم ملف آمن لـ Supabase Storage
// لا يعتمد على اسم الملف الأصلي
// ==================================================

function createSafeFileName(
  prefix: string,
  extension: string
) {
  const safeExtension =
    extension
      .replace(".", "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase() || "file";

  const randomId = Math.random()
    .toString(36)
    .substring(2, 10);

  return `${prefix}-${Date.now()}-${randomId}.${safeExtension}`;
}

// ==================================================
// الحصول على امتداد الملف
// ==================================================

function getFileExtension(fileName: string) {
  const lastDotIndex =
    fileName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "file";
  }

  return fileName.substring(
    lastDotIndex + 1
  );
}

// ==================================================
// رفع الملف إلى Supabase Storage
// ==================================================

async function uploadFile(
  file: File,
  folder: string,
  fileName: string
) {
  const bytes =
    await file.arrayBuffer();

  const filePath =
    `${folder}/${fileName}`;

  const { error } =
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(
        filePath,
        Buffer.from(bytes),
        {
          contentType:
            file.type ||
            "application/octet-stream",

          upsert: false,
        }
      );

  if (error) {
    console.error(
      "SUPABASE STORAGE UPLOAD ERROR:",
      error
    );

    throw new Error(
      `فشل رفع الملف: ${error.message}`
    );
  }

  const {
    data: publicUrlData,
  } =
    supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

// ==================================================
// GET
// ==================================================

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const number =
      searchParams.get("number");

    // ==================================================
    // جلب طلب محدد
    // ==================================================

    if (number) {
      const id = Number(
        number
          .replace("PR-", "")
          .trim()
      );

      if (isNaN(id)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "رقم الطلب غير صحيح",
          },
          { status: 400 }
        );
      }

      const requestData =
        await prisma.request.findUnique(
          {
            where: {
              id,
            },

            include: {
              replies: {
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
          }
        );

      if (!requestData) {
        return NextResponse.json(
          {
            success: false,
            message:
              "لم يتم العثور على الطلب",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: requestData,
      });
    }

    // ==================================================
    // جلب جميع الطلبات
    // ==================================================

    const requests =
      await prisma.request.findMany(
        {
          orderBy: {
            createdAt: "desc",
          },

          include: {
            replies: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        }
      );

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error(
      "GET REQUEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطأ في جلب الطلبات",
      },
      { status: 500 }
    );
  }
}

// ==================================================
// POST
// إنشاء طلب جديد
// ==================================================

export async function POST(
  request: Request
) {
  try {
    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    let companyName = "";
    let requestType = "";
    let details = "";
    let applicantName = "";
    let phone = "";

    let fileUrl:
      | string
      | null = null;

    // ==================================================
    // طلب يحتوي على ملف
    // ==================================================

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await request.formData();

      companyName = String(
        formData.get(
          "companyName"
        ) || ""
      );

      requestType = String(
        formData.get(
          "requestType"
        ) || ""
      );

      details = String(
        formData.get(
          "details"
        ) || ""
      );

      applicantName =
        String(
          formData.get(
            "applicantName"
          ) || ""
        );

      phone = String(
        formData.get(
          "phone"
        ) || ""
      );

      const file =
        formData.get("file");

      // ==================================================
      // رفع الملف إلى Supabase
      // ==================================================

      if (
        file instanceof File &&
        file.size > 0
      ) {
        // التأكد من نوع الملف
        if (
          !allowedTypes.includes(
            file.type
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "نوع الملف غير مسموح. يسمح فقط PDF وExcel والصور JPG وPNG",
            },
            { status: 400 }
          );
        }

        // الحصول على امتداد الملف الأصلي
        const extension =
          getFileExtension(
            file.name
          );

        // إنشاء اسم إنجليزي آمن
        const fileName =
          createSafeFileName(
            "request",
            extension
          );

        // رفع الملف
        fileUrl =
          await uploadFile(
            file,
            "requests",
            fileName
          );
      }
    } else {
      // ==================================================
      // طلب بدون ملف
      // ==================================================

      const body =
        await request.json();

      companyName =
        body.companyName || "";

      requestType =
        body.requestType || "";

      details =
        body.details || "";

      applicantName =
        body.applicantName || "";

      phone =
        body.phone || "";

      fileUrl =
        body.fileUrl || null;
    }

    // ==================================================
    // حفظ الطلب في قاعدة البيانات
    // ==================================================

    const newRequest =
      await prisma.request.create(
        {
          data: {
            companyName,
            requestType,
            details,
            applicantName,
            phone,
            fileUrl,
          },

          include: {
            replies: true,
          },
        }
      );

    return NextResponse.json({
      success: true,
      data: newRequest,
    });
  } catch (error) {
    console.error(
      "POST REQUEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطأ في حفظ الطلب أو رفع الملف",
      },
      { status: 500 }
    );
  }
}

// ==================================================
// PATCH
// ==================================================

export async function PATCH(
  request: Request
) {
  try {
    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    // ==================================================
    // إرسال رد من الأدمن
    // ==================================================

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await request.formData();

      const idValue =
        formData.get("id");

      const replyValue =
        formData.get("reply");

      const file =
        formData.get(
          "replyFile"
        );

      const id =
        Number(idValue);

      if (
        !id ||
        isNaN(id)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "رقم الطلب غير صحيح",
          },
          { status: 400 }
        );
      }

      // ==================================================
      // التأكد من وجود الطلب
      // ==================================================

      const existingRequest =
        await prisma.request.findUnique(
          {
            where: {
              id,
            },
          }
        );

      if (!existingRequest) {
        return NextResponse.json(
          {
            success: false,
            message:
              "الطلب غير موجود",
          },
          { status: 404 }
        );
      }

      const replyText =
        typeof replyValue ===
        "string"
          ? replyValue.trim()
          : "";

      let replyFileUrl:
        | string
        | null = null;

      // ==================================================
      // رفع ملف الرد إلى Supabase
      // ==================================================

      if (
        file instanceof File &&
        file.size > 0
      ) {
        // التأكد من نوع الملف
        if (
          !allowedTypes.includes(
            file.type
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "نوع الملف غير مسموح. يسمح فقط PDF وExcel والصور JPG وPNG",
            },
            { status: 400 }
          );
        }

        // الحصول على امتداد الملف الأصلي
        const extension =
          getFileExtension(
            file.name
          );

        // إنشاء اسم إنجليزي آمن
        const fileName =
          createSafeFileName(
            `reply-${id}`,
            extension
          );

        // رفع الملف
        replyFileUrl =
          await uploadFile(
            file,
            "replies",
            fileName
          );
      }

      // ==================================================
      // التأكد من وجود رد
      // ==================================================

      if (
        !replyText &&
        !replyFileUrl
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "يرجى كتابة الرد أو إرفاق ملف",
          },
          { status: 400 }
        );
      }

      // ==================================================
      // حفظ الرد في سجل الردود
      // ==================================================

      await prisma.requestReply.create(
        {
          data: {
            requestId: id,

            reply:
              replyText || null,

            fileUrl:
              replyFileUrl,
          },
        }
      );

      // ==================================================
      // تحديث الطلب الرئيسي
      // ==================================================

      const updatedRequest =
        await prisma.request.update(
          {
            where: {
              id,
            },

            data: {
              status:
                "تم الرد",

              reply:
                replyText || null,

              replyFileUrl:
                replyFileUrl,

              replyAt:
                new Date(),
            },

            include: {
              replies: {
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
          }
        );

      return NextResponse.json({
        success: true,
        data: updatedRequest,
      });
    }

    // ==================================================
    // تحديث الحالة فقط
    // ==================================================

    const body =
      await request.json();

    const id =
      Number(body.id);

    if (
      !id ||
      isNaN(id)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "رقم الطلب غير صحيح",
        },
        { status: 400 }
      );
    }

    const updatedRequest =
      await prisma.request.update(
        {
          where: {
            id,
          },

          data: {
            status:
              body.status !==
              undefined
                ? body.status
                : undefined,
          },

          include: {
            replies: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        }
      );

    return NextResponse.json({
      success: true,
      data: updatedRequest,
    });
  } catch (error) {
    console.error(
      "PATCH REQUEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطأ غير معروف في تحديث الطلب",
      },
      { status: 500 }
    );
  }
}