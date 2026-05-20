import torch
import torch.nn as nn

class SEBlock(nn.Module):
    def __init__(self, ch, reduction=8):
        super().__init__()
        mid = max(ch // reduction, 4)
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(ch, mid),
            nn.ReLU(inplace=True),
            nn.Linear(mid, ch),
            nn.Sigmoid()
        )

    def forward(self, x):
        w = self.se(x).view(x.shape[0], x.shape[1], 1, 1)
        return x * w


class SEResBlock(nn.Module):
    def __init__(self, ch, dropout=0.1):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(ch, ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(ch, ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(ch),
        )
        self.se = SEBlock(ch)
        self.drop = nn.Dropout2d(dropout)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        out = self.block(x)
        out = self.se(out)
        out = self.drop(out)
        return self.relu(out + x)


class ScaleBranch(nn.Module):
    def __init__(self, dropout=0.25):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            SEResBlock(32, dropout=0.10),
            nn.MaxPool2d(2, 2),

            nn.Conv2d(32, 64, 3, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            SEResBlock(64, dropout=0.12),
            nn.MaxPool2d(2, 2),

            nn.Conv2d(64, 128, 3, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            SEResBlock(128, dropout=0.15),
            nn.MaxPool2d(2, 2),

            nn.Conv2d(128, 256, 3, padding=1, bias=False),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            SEResBlock(256, dropout=0.20),

            nn.AdaptiveAvgPool2d((3, 3)),
        )

        self.proj = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256 * 3 * 3, 512),
            nn.LayerNorm(512),
            nn.GELU(),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        return self.proj(self.net(x))


class WheezeCNNFinal(nn.Module):
    def __init__(self, dropout=0.4):
        super().__init__()

        self.short_branch = ScaleBranch(dropout=dropout * 0.6)
        self.long_branch = ScaleBranch(dropout=dropout * 0.6)

        self.scale_gate = nn.Sequential(
            nn.Linear(1024, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(128, 2),
            nn.Softmax(dim=1)
        )

        self.classifier = nn.Sequential(
            nn.Linear(1024, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(256, 64),
            nn.GELU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(64, 1)
        )

    def forward(self, short, long_):
        fs = self.short_branch(short)
        fl = self.long_branch(long_)

        combined = torch.cat([fs, fl], dim=1)
        gates = self.scale_gate(combined)

        gs = gates[:, 0:1]
        gl = gates[:, 1:2]

        fused = torch.cat([gs * fs, gl * fl], dim=1)
        return self.classifier(fused).squeeze(1)