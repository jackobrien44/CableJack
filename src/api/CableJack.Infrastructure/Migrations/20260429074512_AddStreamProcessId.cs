using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CableJack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStreamProcessId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProcessId",
                table: "Streams",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProcessId",
                table: "Streams");
        }
    }
}
