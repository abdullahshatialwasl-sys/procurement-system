import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function safeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function saveFile(
  file: File,
  prefix: string
): Promise<{
  fileUrl: string;
  fileName: string;
}> {
  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads"
  );

  await mkdir(uploadDir, {
    recursive: true,
  });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const originalFileName = safeFileName(file.name);

  const uniqueName =
    `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}-${originalFileName}`;

  const filePath = path.join(
    uploadDir,
    uniqueName
  );

  await writeFile(
    filePath,
    buffer
  );

  return {
    fileUrl: `/uploads/${uniqueName}`,
    fileName: file.name,
  };
}

// ==================================================
// GET
// ==================================================

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const number =
      searchParams.get("number");

    // البحث عن طلب محدد
    if (number) {
      const cleanNumber =
        number
          .trim()
          .toUpperCase()
          .replace(/^PR-/, "");

      const id = Number(cleanNumber);

      if (
        !id ||
        Number.isNaN(id)
      ) {
        return NextResponse.json({
          success: false,
          message:
            "رقم الطلب غير صحيح",
        });
      }

      const foundRequest =
        await prisma.request.findUnique({
          where: {
            id,
          },
          include: {
            replies: {
              orderBy: {
                createdAt: "desc",
              },
            },
            attachments: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      if (!foundRequest) {
        return NextResponse.json({
          success: false,
          message:
            "لم يتم العثور على الطلب",
        });
      }

      return NextResponse.json({
        success: true,
        data: foundRequest,
      });
    }

    // جلب جميع الطلبات
    const requests =
      await prisma.request.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          replies: {
            orderBy: {
              createdAt: "desc",
            },
          },
          attachments: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error(
      "GET REQUESTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "حدث خطأ أثناء جلب الطلبات",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// POST
// إنشاء طلب جديد
// رفع عدة ملفات
// ==================================================

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const companyName =
      String(
        formData.get(
          "companyName"
        ) || ""
      ).trim();

    const requestType =
      String(
        formData.get(
          "requestType"
        ) || ""
      ).trim();

    const details =
      String(
        formData.get(
          "details"
        ) || ""
      ).trim();

    const applicantName =
      String(
        formData.get(
          "applicantName"
        ) || ""
      ).trim();

    const phone =
      String(
        formData.get(
          "phone"
        ) || ""
      ).trim();

    if (
      !companyName ||
      !requestType ||
      !applicantName ||
      !phone
    ) {
      return NextResponse.json({
        success: false,
        message:
          "يرجى تعبئة جميع الحقول المطلوبة",
      });
    }

    // إنشاء الطلب
    const newRequest =
      await prisma.request.create({
        data: {
          companyName,
          requestType,
          details:
            details || null,
          applicantName,
          phone,
          status: "جديد",
        },
      });

    // ==================================================
    // جمع جميع الملفات
    // ==================================================

    const files =
      formData.getAll(
        "files"
      );

    // دعم اسم الملف القديم
    const oldFile =
      formData.get(
        "file"
      );

    const allFiles: File[] = [];

    for (
      const item of files
    ) {
      if (
        item instanceof File &&
        item.size > 0
      ) {
        allFiles.push(item);
      }
    }

    if (
      oldFile instanceof File &&
      oldFile.size > 0
    ) {
      allFiles.push(oldFile);
    }

    // ==================================================
    // حفظ جميع الملفات
    // ==================================================

    for (
      const file of allFiles
    ) {
      const saved =
        await saveFile(
          file,
          "request"
        );

      await prisma.requestAttachment.create({
        data: {
          requestId:
            newRequest.id,

          fileUrl:
            saved.fileUrl,

          fileName:
            saved.fileName,
        },
      });
    }

    // ==================================================
    // إعادة الطلب مع المرفقات
    // ==================================================

    const finalRequest =
      await prisma.request.findUnique({
        where: {
          id: newRequest.id,
        },
        include: {
          attachments: {
            orderBy: {
              createdAt: "asc",
            },
          },
          replies: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    // ==================================================
    // رسالة نجاح واضحة للمورد
    // ==================================================

    return NextResponse.json({
      success: true,

      message:
        "تم استلام طلبكم بنجاح",

      data: finalRequest,
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
          "حدث خطأ أثناء إرسال الطلب",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// PATCH
// تحديث الحالة أو إرسال رد
// ==================================================

export async function PATCH(
  request: NextRequest
) {
  try {
    const contentType =
      request.headers.get(
        "content-type"
      ) || "";

    // ==================================================
    // تحديث حالة الطلب
    // ==================================================

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      const body =
        await request.json();

      const id =
        Number(body.id);

      const status =
        String(
          body.status || ""
        ).trim();

      if (
        !id ||
        !status
      ) {
        return NextResponse.json({
          success: false,
          message:
            "بيانات التحديث غير صحيحة",
        });
      }

      const updatedRequest =
        await prisma.request.update({
          where: {
            id,
          },
          data: {
            status,
          },
          include: {
            replies: {
              orderBy: {
                createdAt: "desc",
              },
            },
            attachments: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      return NextResponse.json({
        success: true,
        data: updatedRequest,
      });
    }

    // ==================================================
    // إرسال رد للمورد
    // ==================================================

    const formData =
      await request.formData();

    const id =
      Number(
        formData.get(
          "id"
        )
      );

    const reply =
      String(
        formData.get(
          "reply"
        ) || ""
      ).trim();

    if (!id) {
      return NextResponse.json({
        success: false,
        message:
          "رقم الطلب غير صحيح",
      });
    }

    const existingRequest =
      await prisma.request.findUnique({
        where: {
          id,
        },
      });

    if (!existingRequest) {
      return NextResponse.json({
        success: false,
        message:
          "الطلب غير موجود",
      });
    }

    // ==================================================
    // جمع ملفات الرد
    // ==================================================

    const replyFiles =
      formData.getAll(
        "replyFiles"
      );

    const oldReplyFile =
      formData.get(
        "replyFile"
      );

    const allReplyFiles: File[] = [];

    for (
      const item of replyFiles
    ) {
      if (
        item instanceof File &&
        item.size > 0
      ) {
        allReplyFiles.push(item);
      }
    }

    if (
      oldReplyFile instanceof File &&
      oldReplyFile.size > 0
    ) {
      allReplyFiles.push(
        oldReplyFile
      );
    }

    let latestReplyFileUrl:
      string | null = null;

    // ==================================================
    // لا يوجد ملف
    // ==================================================

    if (
      allReplyFiles.length === 0
    ) {
      await prisma.requestReply.create({
        data: {
          requestId: id,

          reply:
            reply || null,

          fileUrl: null,
        },
      });
    }

    // ==================================================
    // يوجد ملف أو أكثر
    // ==================================================

    for (
      let i = 0;
      i < allReplyFiles.length;
      i++
    ) {
      const file =
        allReplyFiles[i];

      const saved =
        await saveFile(
          file,
          "reply"
        );

      latestReplyFileUrl =
        saved.fileUrl;

      await prisma.requestReply.create({
        data: {
          requestId: id,

          reply:
            i === 0
              ? reply || null
              : null,

          fileUrl:
            saved.fileUrl,
        },
      });
    }

    // ==================================================
    // تحديث آخر رد
    // ==================================================

    const updatedRequest =
      await prisma.request.update({
        where: {
          id,
        },
        data: {
          reply:
            reply || null,

          replyFileUrl:
            latestReplyFileUrl,

          replyAt:
            new Date(),

          status:
            "تم الرد",
        },
        include: {
          replies: {
            orderBy: {
              createdAt: "desc",
            },
          },
          attachments: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    return NextResponse.json({
      success: true,

      message:
        "تم إرسال الرد بنجاح",

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
          "حدث خطأ أثناء تحديث الطلب",
      },
      {
        status: 500,
      }
    );
  }
}