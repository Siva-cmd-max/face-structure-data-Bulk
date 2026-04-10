using FaceScannerApi.Data;
using FaceScannerApi.Models;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Threading.Tasks;

namespace FaceScannerApi.Controllers
{
    [ApiController]
    [Route("api/face")]
    public class FaceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FaceController(AppDbContext context)
        {
            _context = context;
        }

        public class FaceScanPayload
        {
            public string ImageName { get; set; } = string.Empty;
            public float ImageSizeKB { get; set; }
            public float ImageWidth { get; set; }
            public float ImageHeight { get; set; }
            public bool FaceDetected { get; set; }
            public float Confidence { get; set; }
            public BoundingBox? FaceBox { get; set; }
            public Point? LeftEye { get; set; }
            public Point? RightEye { get; set; }
            public Point? Nose { get; set; }
            public Point? Mouth { get; set; }
            public float[]? Embedding { get; set; }
            public float ScanTime { get; set; }
        }

        public class BoundingBox { public float X { get; set; } public float Y { get; set; } public float Width { get; set; } public float Height { get; set; } }
        public class Point { public float X { get; set; } public float Y { get; set; } }

        [HttpPost("save-scan")]
        public async Task<IActionResult> SaveScan([FromBody] FaceScanPayload payload)
        {
            if (payload == null || !payload.FaceDetected || payload.Embedding == null || payload.Embedding.Length == 0)
            {
                return BadRequest(new { message = "Invalid payload or no face detected." });
            }

            var record = new FaceDbRecord
            {
                ImageName = payload.ImageName,
                ImageSizeKB = payload.ImageSizeKB,
                ImageWidth = payload.ImageWidth,
                ImageHeight = payload.ImageHeight,
                FaceDetected = payload.FaceDetected,
                Confidence = payload.Confidence,
                ScanTimeMs = payload.ScanTime,
                FaceEmbedding = JsonSerializer.Serialize(payload.Embedding)
            };

            if (payload.FaceBox != null)
            {
                record.FaceBox_X = payload.FaceBox.X;
                record.FaceBox_Y = payload.FaceBox.Y;
                record.FaceBox_Width = payload.FaceBox.Width;
                record.FaceBox_Height = payload.FaceBox.Height;
            }

            if (payload.LeftEye != null) { record.LeftEye_X = payload.LeftEye.X; record.LeftEye_Y = payload.LeftEye.Y; }
            if (payload.RightEye != null) { record.RightEye_X = payload.RightEye.X; record.RightEye_Y = payload.RightEye.Y; }
            if (payload.Nose != null) { record.Nose_X = payload.Nose.X; record.Nose_Y = payload.Nose.Y; }
            if (payload.Mouth != null) { record.Mouth_X = payload.Mouth.X; record.Mouth_Y = payload.Mouth.Y; }

            _context.FaceEmbeddings.Add(record);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Scan saved successfully", scanTime = record.ScanTimeMs });
        }
    }
}
