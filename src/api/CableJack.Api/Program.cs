using CableJack.Api;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddOpenApiDocument();
builder.Services.AddControllers();
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddCorsPolicy();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseOpenApi();
    app.UseSwaggerUi();
}

app.UseHttpsRedirection();
app.UseCors("Development");
app.MapControllers();

app.Run();
