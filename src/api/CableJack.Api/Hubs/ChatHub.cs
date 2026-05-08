using System.Collections.Concurrent;
using System.Security.Claims;
using CableJack.Core.Models;
using CableJack.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CableJack.Api.Hubs
{
    [Authorize]
    public class ChatHub(CableJackDbContext db) : Hub
    {
        private static readonly ConcurrentDictionary<int, Queue<DateTime>> _rateLimits = new();

        public async Task JoinChannel(int channelId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(channelId));

            var cutoff = DateTime.UtcNow.AddHours(-24);
            var history = await db.ChatMessages
                .Where(m => m.ChannelId == channelId && m.SentAt >= cutoff)
                .OrderByDescending(m => m.SentAt)
                .Take(50)
                .OrderBy(m => m.SentAt)
                .Select(m => new { m.Id, m.UserId, m.Username, m.Text, m.SentAt })
                .ToListAsync();

            await Clients.Caller.SendAsync("History", history);
        }

        public async Task LeaveChannel(int channelId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(channelId));
        }

        public async Task SendMessage(int channelId, string text)
        {
            var userId = int.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var username = Context.User!.FindFirstValue(ClaimTypes.Name)!;

            if (IsRateLimited(userId)) return;

            text = text.Trim();
            if (string.IsNullOrEmpty(text)) return;
            if (text.Length > 500) text = text[..500];

            var msg = new ChatMessage
            {
                ChannelId = channelId,
                UserId = userId,
                Username = username,
                Text = text,
                SentAt = DateTime.UtcNow,
            };

            db.ChatMessages.Add(msg);
            await db.SaveChangesAsync();

            await Clients.Group(GroupName(channelId)).SendAsync("NewMessage", new
            {
                msg.Id,
                msg.UserId,
                msg.Username,
                msg.Text,
                msg.SentAt,
            });
        }

        private static string GroupName(int channelId) => $"channel-{channelId}";

        private static bool IsRateLimited(int userId)
        {
            var window = _rateLimits.GetOrAdd(userId, _ => new Queue<DateTime>());
            lock (window)
            {
                var cutoff = DateTime.UtcNow.AddSeconds(-10);
                while (window.Count > 0 && window.Peek() < cutoff) window.Dequeue();
                if (window.Count >= 5) return true;
                window.Enqueue(DateTime.UtcNow);
                return false;
            }
        }
    }
}
