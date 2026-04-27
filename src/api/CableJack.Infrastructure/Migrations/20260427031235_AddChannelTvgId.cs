using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CableJack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChannelTvgId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TvgId",
                table: "Channels",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TvgId",
                table: "Channels");
        }
    }
}
