using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CableJack.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MultiProviderChannelSources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Channels_Categories_CategoryId",
                table: "Channels");

            migrationBuilder.DropForeignKey(
                name: "FK_Channels_Providers_ProviderId",
                table: "Channels");

            migrationBuilder.DropIndex(
                name: "IX_Channels_ProviderId",
                table: "Channels");

            migrationBuilder.DropColumn(
                name: "ProviderId",
                table: "Channels");

            migrationBuilder.DropColumn(
                name: "SourceUrl",
                table: "Channels");

            migrationBuilder.AddColumn<int>(
                name: "ProviderId",
                table: "Streams",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxConcurrentStreams",
                table: "Providers",
                type: "INTEGER",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.Sql("UPDATE Providers SET MaxConcurrentStreams = 3 WHERE MaxConcurrentStreams = 0");

            migrationBuilder.CreateTable(
                name: "ChannelSources",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ChannelId = table.Column<int>(type: "INTEGER", nullable: false),
                    ProviderId = table.Column<int>(type: "INTEGER", nullable: false),
                    SourceUrl = table.Column<string>(type: "TEXT", nullable: false),
                    Priority = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChannelSources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChannelSources_Channels_ChannelId",
                        column: x => x.ChannelId,
                        principalTable: "Channels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChannelSources_Providers_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "Providers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Streams_ProviderId",
                table: "Streams",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_ChannelSources_ChannelId",
                table: "ChannelSources",
                column: "ChannelId");

            migrationBuilder.CreateIndex(
                name: "IX_ChannelSources_ProviderId",
                table: "ChannelSources",
                column: "ProviderId");

            migrationBuilder.AddForeignKey(
                name: "FK_Channels_Categories_CategoryId",
                table: "Channels",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Streams_Providers_ProviderId",
                table: "Streams",
                column: "ProviderId",
                principalTable: "Providers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Channels_Categories_CategoryId",
                table: "Channels");

            migrationBuilder.DropForeignKey(
                name: "FK_Streams_Providers_ProviderId",
                table: "Streams");

            migrationBuilder.DropTable(
                name: "ChannelSources");

            migrationBuilder.DropIndex(
                name: "IX_Streams_ProviderId",
                table: "Streams");

            migrationBuilder.DropColumn(
                name: "ProviderId",
                table: "Streams");

            migrationBuilder.DropColumn(
                name: "MaxConcurrentStreams",
                table: "Providers");

            migrationBuilder.AddColumn<int>(
                name: "ProviderId",
                table: "Channels",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceUrl",
                table: "Channels",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Channels_ProviderId",
                table: "Channels",
                column: "ProviderId");

            migrationBuilder.AddForeignKey(
                name: "FK_Channels_Categories_CategoryId",
                table: "Channels",
                column: "CategoryId",
                principalTable: "Categories",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Channels_Providers_ProviderId",
                table: "Channels",
                column: "ProviderId",
                principalTable: "Providers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
