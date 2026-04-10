USE [FaceVerificationDB];
GO

-- 1. Check if the scan-time column exists, and alter if it does not.
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[FaceEmbeddings]') 
    AND name = 'ScanTimeMs'
)
BEGIN
    ALTER TABLE [dbo].[FaceEmbeddings] ADD [ScanTimeMs] FLOAT;
END
GO

-- 2. Image metrics
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[FaceEmbeddings]') 
    AND name = 'ImageSizeKB'
)
BEGIN
    ALTER TABLE [dbo].[FaceEmbeddings] ADD [ImageSizeKB] FLOAT;
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[FaceEmbeddings]') 
    AND name = 'Confidence'
)
BEGIN
    ALTER TABLE [dbo].[FaceEmbeddings] ADD [Confidence] FLOAT;
END
GO

-- 3. Bounding Box Coordinates
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[FaceEmbeddings]') 
    AND name = 'FaceBox_X'
)
BEGIN
    ALTER TABLE [dbo].[FaceEmbeddings] ADD 
        [FaceBox_X] FLOAT,
        [FaceBox_Y] FLOAT,
        [FaceBox_Width] FLOAT,
        [FaceBox_Height] FLOAT;
END
GO

-- 4. Left Eye Coordinates
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[FaceEmbeddings]') 
    AND name = 'LeftEye_X'
)
BEGIN
    ALTER TABLE [dbo].[FaceEmbeddings] ADD 
        [LeftEye_X] FLOAT,
        [LeftEye_Y] FLOAT;
END
GO

-- 5. Right Eye Coordinates
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[FaceEmbeddings]') 
    AND name = 'RightEye_X'
)
BEGIN
    ALTER TABLE [dbo].[FaceEmbeddings] ADD 
        [RightEye_X] FLOAT,
        [RightEye_Y] FLOAT;
END
GO

-- 6. Nose Coordinates
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[FaceEmbeddings]') 
    AND name = 'Nose_X'
)
BEGIN
    ALTER TABLE [dbo].[FaceEmbeddings] ADD 
        [Nose_X] FLOAT,
        [Nose_Y] FLOAT;
END
GO

-- 7. Mouth Coordinates
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[FaceEmbeddings]') 
    AND name = 'Mouth_X'
)
BEGIN
    ALTER TABLE [dbo].[FaceEmbeddings] ADD 
        [Mouth_X] FLOAT,
        [Mouth_Y] FLOAT;
END
GO
