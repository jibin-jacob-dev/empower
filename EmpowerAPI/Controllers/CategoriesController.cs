using EmpowerAPI.Data;
using EmpowerAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmpowerAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class CategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CategoriesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous] // Allow public viewing for dropdowns
        public async Task<ActionResult<IEnumerable<Category>>> GetCategories([FromQuery] string? type)
        {
            var query = _context.Categories.Where(c => c.IsActive);
            
            if (!string.IsNullOrEmpty(type))
            {
                query = query.Where(c => c.TargetType == type);
            }

            return await query.OrderBy(c => c.Name).ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Category>> CreateCategory(Category category)
        {
            if (await _context.Categories.AnyAsync(c => c.Name == category.Name && c.TargetType == category.TargetType))
            {
                return BadRequest("Category already exists.");
            }

            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCategories), new { id = category.Id }, category);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCategory(int id, Category update)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound();

            category.Name = update.Name;
            category.TargetType = update.TargetType;
            // Optionally update IsActive if needed
            
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound();

            // Soft delete
            category.IsActive = false;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
