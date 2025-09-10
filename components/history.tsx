"use client";

import { motion, AnimatePresence } from "framer-motion";
import { InfoIcon, MenuIcon, PencilEditIcon } from "./icons";
import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import cx from "classnames";
import { useParams, usePathname } from "next/navigation";
import { Chat } from "@/schema";
import { fetcher } from "@/utils/functions";

// History tray is deprecated. Navbar no longer imports this component.
export const History = () => null;
