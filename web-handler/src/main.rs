use std::time::Duration;

use lambda_http::{
    run, service_fn,
    tracing::{self, instrument},
    Body, Error, Request, RequestExt, Response,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, Registry};

#[instrument(name = "Nested in Long Operation")]
fn do_nested_operation() {
    std::thread::sleep(Duration::from_millis(100));
}

#[instrument(name = "Standalone Operation")]
fn do_standalone_operation() {
    std::thread::sleep(Duration::from_millis(200));
}

#[instrument(name = "Long Operation")]
fn do_operation() {
    std::thread::sleep(Duration::from_millis(500));
    do_nested_operation();
}

#[instrument(name = "Function Handler")]
async fn function_handler(event: Request) -> Result<Response<Body>, Error> {
    do_operation();
    do_standalone_operation();
    let resp = Response::builder()
        .status(200)
        .header("content-type", "text/html")
        .body("Hello World".into())
        .map_err(Box::new)?;
    Ok(resp)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    let tracer = opentelemetry_datadog::new_pipeline()
        .with_service_name("web-handler")
        .with_agent_endpoint("http://127.0.0.1:8126")
        .with_api_version(opentelemetry_datadog::ApiVersion::Version05)
        .with_trace_config(
            opentelemetry_sdk::trace::config()
                .with_sampler(opentelemetry_sdk::trace::Sampler::AlwaysOn)
                .with_id_generator(opentelemetry_sdk::trace::RandomIdGenerator::default()),
        )
        .install_simple()
        .unwrap();
    let telemetry_layer = tracing_opentelemetry::layer().with_tracer(tracer);
    let logger = tracing_subscriber::fmt::layer().json().flatten_event(true);
    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_target(false)
        .without_time();

    Registry::default()
        .with(fmt_layer)
        .with(telemetry_layer)
        .with(logger)
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    run(service_fn(function_handler)).await
}
