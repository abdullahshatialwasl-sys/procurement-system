-- CreateTable
CREATE TABLE "public"."Request" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'عادي',
    "referenceNo" TEXT,
    "details" TEXT,
    "applicantName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'جديد',
    "reply" TEXT,
    "replyFileUrl" TEXT,
    "replyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RequestReply" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "reply" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestReply_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."RequestReply" ADD CONSTRAINT "RequestReply_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
