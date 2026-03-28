using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using EmpowerAPI.Models;

namespace EmpowerAPI.Data
{
    public class ApplicationDbContext : IdentityDbContext<User>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Product> Products { get; set; }
        public DbSet<Training> Trainings { get; set; }
        public DbSet<Category> Categories { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure additional rules here if necessary, 
            // e.g. decimal precision
            builder.Entity<Product>()
                .Property(p => p.Price)
                .HasColumnType("decimal(18,2)");
                
            builder.Entity<User>()
                .Property(u => u.HeightCm)
                .HasColumnType("decimal(18,2)");
                
            builder.Entity<User>()
                .Property(u => u.WeightKg)
                .HasColumnType("decimal(18,2)");
        }
    }
}
