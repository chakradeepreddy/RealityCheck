CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`schema_version` text NOT NULL,
	`sequence_index` integer NOT NULL,
	`timestamp` text NOT NULL,
	`url` text NOT NULL,
	`browser_conditions` text,
	`page_state` text,
	`dom_observations` text,
	`canary_markers` text,
	`evidence_refs` text,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`schema_version` text NOT NULL,
	`claim` text NOT NULL,
	`target_url` text NOT NULL,
	`primitive` text NOT NULL,
	`execution_mode` text NOT NULL,
	`adapter` text NOT NULL,
	`adapter_version` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`status` text NOT NULL,
	`verdict` text NOT NULL,
	`verdict_reason` text,
	`claimed_boundary` real,
	`observed_boundary` real,
	`browser_environment` text NOT NULL,
	`test_conditions` text NOT NULL,
	`experiment_spec` text NOT NULL
);
