pub mod tax;
pub mod health;

// Re-export handler functions for convenience
pub use tax::calculate_tax;
pub use health::health;
