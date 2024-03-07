import React from "react";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import { deepOrange } from "@material-ui/core/colors";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    messageRow: {
      display: "flex"
    },
    messageRowRight: {
      display: "flex",
      justifyContent: "flex-end"
    },

    messageContent: {
      padding: 0,
      margin: 0
    },

    orange: {
      color: theme.palette.getContrastText(deepOrange[500]),
      backgroundColor: deepOrange[500],
      width: theme.spacing(4),
      height: theme.spacing(4)
    },
    avatarNothing: {
      color: "transparent",
      backgroundColor: "transparent",
      width: theme.spacing(4),
      height: theme.spacing(4)
    },
    displayName: {
      marginLeft: "20px"
    }
  })
);

interface MessageProps {
  message: string,
}

export const Message: React.FC<MessageProps> = ({ message }) => {

  const classes = useStyles();
  return (
    <>
      <div className={classes.messageRow}>
        <div>
          <p className={classes.messageContent}>{message}</p>
        </div>
      </div>
    </>
  );
};
