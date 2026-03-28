using System.ComponentModel.DataAnnotations;

namespace EmpowerAPI.Models
{
    public class Category
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
        
        // Optional: differentiator for content types (e.g., "Product", "Training")
        public string TargetType { get; set; } = "Product";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
