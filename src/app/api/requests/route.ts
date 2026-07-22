import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

const BUCKET_NAME = "uploads";

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
  if (!file || file.size === 0) {
    throw new Error("الملف فارغ أو غير صالح");
  }

  const originalFileName = safeFileName(file.name);

  const uniqueName = `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}-${originalFileName}`;

  const filePath = `${prefix}/${uniqueName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType:
        file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error(
      "SUPABASE STORAGE UPLOAD ERROR:",
      error
    );

    throw new Error(
      `فشل رفع الملف: ${error.message}`
    );
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error(
      "تم رفع الملف ولكن تعذر إنشاء رابط الملف"
    );
  }

  return {
    fileUrl: data.publicUrl,
    fileName: file.name,
  };
}

// ==================================================
// GET
// جلب جميع الطلبات للأدمن مع المرفقات والردود
// أو البحث عن طلب برقم PR للمورد
// ==================================================

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const number =
      searchParams.get("number");

    // ==================================================
    // البحث عن طلب محدد للمورد
    // لا يتم إرجاع attachments الخاصة بالمورد
    // ==================================================

    if (number) {
      const cleanNumber = number
        .trim()
        .toUpperCase()
        .replace(/^PR-/, "");

      const id = Number(cleanNumber);

      if (!id || Number.isNaN(id)) {
        return NextResponse.json({
          success: false,
          message: "رقم الطلب غير صحيح",
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
          },
        });

      if (!foundRequest) {
        return NextResponse.json({
          success: false,
          message:
            "لم يتم العثور على الطلب",
        });
      }

      // نرجع فقط البيانات التي يحتاجها المورد
      // بدون attachments
      return NextResponse.json({
        success: true,
        data: {
          id: foundRequest.id,
          companyName:
            foundRequest.companyName,
          requestType:
            foundRequest.requestType,
          details:
            foundRequest.details,
          status:
            foundRequest.status,
          reply:
            foundRequest.reply,
          replyFileUrl:
            foundRequest.replyFileUrl,
        },
      });
    }

    // ==================================================
    // جلب جميع الطلبات للأدمن
    // المرفقات تظهر للأدمن بشكل طبيعي
    // ==================================================

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
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء جلب الطلبات",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// POST
// إنشاء طلب جديد + حفظ جميع المرفقات
// ==================================================

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const companyName = String(
      formData.get("companyName") || ""
    ).trim();

    const requestType = String(
      formData.get("requestType") || ""
    ).trim();

    const details = String(
      formData.get("details") || ""
    ).trim();

    const applicantName = String(
      formData.get("applicantName") || ""
    ).trim();

    const phone = String(
      formData.get("phone") || ""
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

    // ==================================================
    // جمع جميع ملفات المورد
    // ==================================================

    const uploadedFiles =
      formData.getAll("files");

    const oldFile =
      formData.get("file");

    const allFiles: File[] = [];

    for (const item of uploadedFiles) {
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
    // رفع جميع الملفات إلى Supabase
    // ==================================================

    const savedAttachments: {
      fileUrl: string;
      fileName: string;
    }[] = [];

    for (const file of allFiles) {
      const saved = await saveFile(
        file,
        "requests"
      );

      savedAttachments.push(saved);
    }

    // ==================================================
    // إنشاء الطلب مع المرفقات
    // ==================================================

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

          attachments: {
            create: savedAttachments.map(
              (attachment) => ({
                fileUrl:
                  attachment.fileUrl,
                fileName:
                  attachment.fileName,
              })
            ),
          },
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
    // إرجاع الطلب النهائي
    // ==================================================

    return NextResponse.json({
      success: true,

      message:
        "تم استلام طلبكم بنجاح",

      requestNumber:
        `PR-${newRequest.id}`,

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
            : "حدث خطأ أثناء إرسال الطلب",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// PATCH
// تحديث حالة الطلب
// أو إرسال رد للمورد
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

      const id = Number(body.id);

      const status = String(
        body.status || ""
      ).trim();

      if (!id || !status) {
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

    const id = Number(
      formData.get("id")
    );

    const reply = String(
      formData.get("reply") || ""
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

    for (const item of replyFiles) {
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

    // ==================================================
    // رفع ملفات الرد
    // ==================================================

    const savedReplyFiles: {
      fileUrl: string;
    }[] = [];

    for (
      const file of allReplyFiles
    ) {
      const saved =
        await saveFile(
          file,
          "replies"
        );

      savedReplyFiles.push({
        fileUrl:
          saved.fileUrl,
      });
    }

    // ==================================================
    // إنشاء سجل الرد
    // ==================================================

    if (
      savedReplyFiles.length === 0
    ) {
      await prisma.requestReply.create(
        {
          data: {
            requestId: id,
            reply:
              reply || null,
            fileUrl: null,
          },
        }
      );
    } else {
      for (
        let i = 0;
        i < savedReplyFiles.length;
        i++
      ) {
        await prisma.requestReply.create(
          {
            data: {
              requestId: id,

              reply:
                i === 0
                  ? reply || null
                  : null,

              fileUrl:
                savedReplyFiles[i]
                  .fileUrl,
            },
          }
        );
      }
    }

    // ==================================================
    // آخر ملف رد
    // ==================================================

    const latestReplyFileUrl =
      savedReplyFiles.length > 0
        ? savedReplyFiles[
            savedReplyFiles.length - 1
          ].fileUrl
        : null;

    // ==================================================
    // تحديث الطلب الرئيسي
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
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تحديث الطلب",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// DELETE
// حذف الطلب وجميع المرفقات والردود المرتبطة
// ==================================================

export async function DELETE(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const id = Number(body.id);

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

        include: {
          attachments: true,
          replies: true,
        },
      });

    if (!existingRequest) {
      return NextResponse.json({
        success: false,
        message:
          "الطلب غير موجود",
      });
    }

    // حذف الطلب
    // العلاقات في Prisma عندك تستخدم Cascade
    // لذلك سيتم حذف replies و attachments تلقائيًا
    await prisma.request.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "تم حذف الطلب وجميع البيانات المرتبطة به بنجاح",
    });
  } catch (error) {
    console.error(
      "DELETE REQUEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء حذف الطلب",
      },
      {
        status: 500,
      }
    );
  }
}