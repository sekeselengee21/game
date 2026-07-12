package dev.manestack.config;

import dev.manestack.service.user.User;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import org.jooq.DSLContext;

import static dev.manestack.jooq.generated.Tables.POKER_USER;

/**
 * Promotes a configured user to ADMIN on startup so fresh deployments don't
 * require hand-editing SQL. Set APP_BOOTSTRAP_ADMIN_EMAIL on the backend
 * container to the email of the account that should be an admin. Runs after
 * Flyway migrate-at-start, so the schema is guaranteed to exist. No-op when the
 * env var is blank or the user hasn't registered yet (they are also promoted at
 * registration time, see UserService#registerUser).
 */
@ApplicationScoped
public class AdminBootstrap {

    private static final Logger LOG = Logger.getLogger(AdminBootstrap.class);

    @Inject
    DSLContext dsl;

    @ConfigProperty(name = "app.bootstrap.admin-email", defaultValue = "")
    String bootstrapAdminEmail;

    void onStart(@Observes StartupEvent event) {
        if (bootstrapAdminEmail == null || bootstrapAdminEmail.isBlank()) {
            return;
        }
        String email = bootstrapAdminEmail.trim().toLowerCase();

        int updated = dsl.update(POKER_USER)
                .set(POKER_USER.ROLE, User.Role.ADMIN.name())
                .where(POKER_USER.EMAIL.eq(email))
                .and(POKER_USER.ROLE.ne(User.Role.ADMIN.name()))
                .execute();

        if (updated > 0) {
            LOG.infov("Bootstrap admin: promoted {0} to ADMIN", email);
        } else {
            LOG.infov("Bootstrap admin: no non-admin user matched {0} "
                    + "(already ADMIN, or not registered yet)", email);
        }
    }
}
