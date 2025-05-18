-- Table: public.messages

-- DROP TABLE IF EXISTS public.messages;

CREATE TABLE IF NOT EXISTS public.messages
(
    id integer NOT NULL DEFAULT nextval('messages_id_seq'::regclass),
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    message text COLLATE pg_catalog."default" NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sent_pic_url text COLLATE pg_catalog."default",
    seen boolean DEFAULT false,
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id)
        REFERENCES public.user_data (user_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id)
        REFERENCES public.user_data (user_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.messages
    OWNER to postgres;