-- Table: public.user_data

-- DROP TABLE IF EXISTS public.user_data;

CREATE TABLE IF NOT EXISTS public.user_data
(
    id integer NOT NULL DEFAULT nextval('user_data_id_seq'::regclass),
    user_id integer,
    avatar_url text COLLATE pg_catalog."default",
    bio text COLLATE pg_catalog."default",
    name text COLLATE pg_catalog."default",
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_seen timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_data_pkey PRIMARY KEY (id),
    CONSTRAINT unique_user_id UNIQUE (user_id),
    CONSTRAINT fk_user_auth FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.user_data
    OWNER to postgres;