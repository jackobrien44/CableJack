using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CableJack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIsChatEnabled : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsChatEnabled",
                table: "Users",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsChatEnabled",
                table: "Users");
        }
    }
}
