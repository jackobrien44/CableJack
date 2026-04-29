using CableJack.Api;
using CableJack.Api.Middleware;
using CableJack.Core.Enums;
using CableJack.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApiDocument(config =>
{
    config.Title = "CableJack API";
    config.AddSecurity("Bearer", new NSwag.OpenApiSecurityScheme
    {
        Type = NSwag.OpenApiSecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Paste your JWT access token here.",
    });
    config.OperationProcessors.Add(new NSwag.Generation.Processors.Security.OperationSecurityScopeProcessor("Bearer"));
});
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddCorsPolicy();
builder.Services.ConfigureAuthentication(builder.Configuration);

var app = builder.Build();

Directory.CreateDirectory(Path.Combine(app.Environment.ContentRootPath, "wwwroot", "streams"));

// Reset any streams left in Starting/Running state from a previous run
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CableJackDbContext>();
    var reset = await db.Streams
        .Where(s => s.Status == StreamStatus.Starting || s.Status == StreamStatus.Running)
        .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, StreamStatus.Error));
    if (reset > 0)
        app.Logger.LogInformation("Reset {Count} orphaned stream(s) to Error on startup", reset);
}

if (app.Environment.IsDevelopment())
{
    app.UseOpenApi();
    app.UseSwaggerUi();
}

app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseHttpsRedirection();
app.UseCors("Development");
var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
provider.Mappings[".m3u8"] = "application/vnd.apple.mpegurl";
provider.Mappings[".ts"] = "video/mp2t";
app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = provider });
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
