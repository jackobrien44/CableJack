using CableJack.Api;
using CableJack.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureOpenApi();
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddCorsPolicy();
builder.Services.ConfigureAuthentication(builder.Configuration);

var app = builder.Build();

await app.RunStartupTasksAsync();

if (app.Environment.IsDevelopment())
{
    app.UseOpenApi();
    app.UseSwaggerUi();
}

app.UseMiddleware<ErrorHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
    app.UseCors("Development");
}

app.UseStreamStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
