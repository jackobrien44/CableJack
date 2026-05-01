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
        public DbSet<UserFavorite> UserFavorites { get; set; }
        public DbSet<WatchHistory> WatchHistory { get; set; }
        public DbSet<Provider> Providers { get; set; }
        public DbSet<SystemSetting> SystemSettings { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Channel>()
                .HasOne(c => c.Category)
                .WithMany(c => c.Channels)
                .HasForeignKey(c => c.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Channel>()
                .HasOne(c => c.Provider)
                .WithMany(p => p.Channels)
                .HasForeignKey(c => c.ProviderId)
                .OnDelete(DeleteBehavior.SetNull);

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

            modelBuilder.Entity<UserFavorite>()
                .HasKey(f => new { f.UserId, f.ChannelId });

            modelBuilder.Entity<UserFavorite>()
                .HasOne(f => f.User)
                .WithMany(u => u.Favorites)
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserFavorite>()
                .HasOne(f => f.Channel)
                .WithMany(c => c.Favorites)
                .HasForeignKey(f => f.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WatchHistory>()
                .HasOne(w => w.User)
                .WithMany()
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WatchHistory>()
                .HasOne(w => w.Channel)
                .WithMany()
                .HasForeignKey(w => w.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WatchHistory>()
                .HasIndex(w => new { w.UserId, w.StartedAt });

            modelBuilder.Entity<SystemSetting>()
                .HasIndex(s => s.Key)
                .IsUnique();

            modelBuilder.Entity<AuditLog>()
                .HasIndex(a => a.Timestamp);
        }

    }
}
