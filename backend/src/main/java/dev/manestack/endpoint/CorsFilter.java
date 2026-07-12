package dev.manestack.endpoint;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.util.List;

@Provider
public class CorsFilter implements ContainerResponseFilter {

    // Comma-separated allowlist. Override per-deployment without recompiling by
    // setting the APP_CORS_ALLOWED_ORIGINS env var on the backend container,
    // e.g. APP_CORS_ALLOWED_ORIGINS=https://your-domain.example,http://1.2.3.4
    @ConfigProperty(
        name = "app.cors.allowed-origins",
        defaultValue = "http://localhost:5173,"
            + "http://146.190.100.183,"
            + "https://golden-swan.online,"
            + "https://chilugen.biz,"
            + "https://dollarz.shop,"
            + "http://178.128.214.22,"
            + "http://34.150.99.162"
    )
    List<String> allowedOrigins;

    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) throws IOException {
        String origin = requestContext.getHeaderString("Origin");

        if (origin != null && allowedOrigins.contains(origin)) {
            responseContext.getHeaders().add("Access-Control-Allow-Origin", origin);
            responseContext.getHeaders().add("Access-Control-Allow-Credentials", "true");
        }

        responseContext.getHeaders().add(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-Requested-With, Accept"
        );
        responseContext.getHeaders().add(
            "Access-Control-Allow-Methods",
            "OPTIONS, GET, POST, PUT, DELETE, HEAD, PATCH"
        );
        responseContext.getHeaders().add("Access-Control-Max-Age", "100000");
    }
}
