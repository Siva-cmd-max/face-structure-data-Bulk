using FaceScannerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FaceScannerApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<FaceDbRecord> FaceEmbeddings { get; set; }
    }
}
