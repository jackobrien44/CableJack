using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CableJack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProviderExpiration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "ExpiresAt",
                table: "Providers",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "Providers");
        }
    }
}
