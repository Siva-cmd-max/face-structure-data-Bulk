using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FaceScannerApi.Models
{
    [Table("FaceEmbeddings", Schema = "dbo")]
    public class FaceDbRecord
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public string ImageName { get; set; } = string.Empty;
        public float? ImageSizeKB { get; set; }
        public float? ImageWidth { get; set; }
        public float? ImageHeight { get; set; }
        public bool? FaceDetected { get; set; }
        public float? Confidence { get; set; }
        
        [Column("Embedding")]
        public string FaceEmbedding { get; set; } = string.Empty;
        public float? ScanTimeMs { get; set; }

        public float? FaceBox_X { get; set; }
        public float? FaceBox_Y { get; set; }
        public float? FaceBox_Width { get; set; }
        public float? FaceBox_Height { get; set; }

        public float? LeftEye_X { get; set; }
        public float? LeftEye_Y { get; set; }
        
        public float? RightEye_X { get; set; }
        public float? RightEye_Y { get; set; }
        
        public float? Nose_X { get; set; }
        public float? Nose_Y { get; set; }
        
        public float? Mouth_X { get; set; }
        public float? Mouth_Y { get; set; }
    }
}
