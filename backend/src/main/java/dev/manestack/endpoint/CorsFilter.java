package dev.manestack.endpoint;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Provider
public class CorsFilter implements ContainerResponseFilter {

    private static final List<String> ALLOWED_ORIGINS = Arrays.asList(
        "http://localhost:5173",
        "http://146.190.100.183",
        "https://golden-swan.online",
        "https://chilugen.biz",
        "https://dollarz.shop",
        "http://178.128.214.22"
    );

    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) throws IOException {
        String origin = requestContext.getHeaderString("Origin");

        if (origin != null && ALLOWED_ORIGINS.contains(origin)) {
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
