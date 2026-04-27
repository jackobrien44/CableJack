using CableJack.Core.Models;
using Microsoft.EntityFrameworkCore;
using Stream = CableJack.Core.Models.Stream;

namespace CableJack.Infrastructure.Data
{
    public class CableJackDbContext(DbContextOptions<CableJackDbContext> options) : DbContext(options)
    {
        public DbSet<User> Users { get; set; }
        public DbSet<Channel> Channels { get; set; }
        public DbSet<Stream> Streams { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<UserToken> UserTokens { get; set; }
        public DbSet<Programme> Programmes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Channel>()
                .HasOne(c => c.Category)
                .WithMany(c => c.Channels)
                .HasForeignKey(c => c.CategoryId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Stream>()
                .HasOne(s => s.Channel)
                .WithMany(c => c.Streams)
                .HasForeignKey(s => s.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Stream>()
                .HasOne(u => u.User)
                .WithMany(s => s.Streams)
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<UserToken>()
                .HasOne(u => u.User)
                .WithMany(t => t.Tokens)
                .HasForeignKey(u => u.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Programme>()
                .HasOne(p => p.Channel)
                .WithMany(c => c.Programmes)
                .HasForeignKey(p => p.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Programme>()
                .HasIndex(p => new { p.ChannelId, p.StartTime });
        }

    }
}
